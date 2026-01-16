/**
 * Validation Service
 * Enforces NDIS rules: price guide, provider eligibility, category rules
 */

import { prisma } from "@/lib/prisma";
import { checkWorkerNDISVerification } from "@/lib/access-control/ndis-guards";
import axios from "axios";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  priceGuideMatch?: {
    serviceCode: string;
    maxPrice: number;
    actualPrice: number;
  };
}

export interface PriceGuideEntry {
  serviceCode: string;
  description: string;
  maxPrice: number;
  unit: string; // e.g., "per hour", "per session"
  categoryCode: string;
}

export class ValidationService {
  private priceGuideApiUrl: string;
  private priceGuideApiKey?: string;
  private providerRegistryUrl?: string;

  constructor(config?: {
    priceGuideApiUrl?: string;
    priceGuideApiKey?: string;
    providerRegistryUrl?: string;
  }) {
    this.priceGuideApiUrl =
      config?.priceGuideApiUrl ||
      process.env.NDIS_PRICE_GUIDE_API_URL ||
      "";
    this.priceGuideApiKey =
      config?.priceGuideApiKey ||
      process.env.NDIS_PRICE_GUIDE_API_KEY;
    this.providerRegistryUrl =
      config?.providerRegistryUrl ||
      process.env.NDIS_PROVIDER_REGISTRY_URL;
  }

  /**
   * Validate price against NDIS price guide
   */
  async validatePriceGuide(
    serviceCode: string,
    amount: number
  ): Promise<{ valid: boolean; maxPrice?: number; error?: string }> {
    if (!this.priceGuideApiUrl) {
      // If no API configured, skip validation (for development)
      console.warn("Price guide API not configured, skipping validation");
      return { valid: true };
    }

    try {
      const response = await axios.get<PriceGuideEntry>(
        `${this.priceGuideApiUrl}/services/${serviceCode}`,
        {
          headers: this.priceGuideApiKey
            ? { Authorization: `Bearer ${this.priceGuideApiKey}` }
            : {},
        }
      );

      const priceGuide = response.data;

      if (amount > priceGuide.maxPrice) {
        return {
          valid: false,
          maxPrice: priceGuide.maxPrice,
          error: `Price ${amount} exceeds maximum ${priceGuide.maxPrice} for service ${serviceCode}`,
        };
      }

      return { valid: true, maxPrice: priceGuide.maxPrice };
    } catch (error: any) {
      // If API call fails, log but don't block (graceful degradation)
      console.error("Price guide validation error:", error.message);
      return {
        valid: true, // Allow transaction if API is unavailable
      };
    }
  }

  /**
   * Validate provider can deliver the service
   */
  async validateProvider(
    providerId: string,
    serviceCode: string
  ): Promise<{ valid: boolean; error?: string }> {
    // Check provider registration
    const registration = await prisma.providerRegistration.findUnique({
      where: { userId: providerId },
    });

    if (!registration) {
      return {
        valid: false,
        error: "Provider not registered with NDIS",
      };
    }

    if (registration.registrationStatus !== "ACTIVE") {
      return {
        valid: false,
        error: `Provider registration status: ${registration.registrationStatus}`,
      };
    }

    // Check if provider is registered for this service category
    if (registration.serviceCategories.length > 0) {
      // Extract category code from service code (assuming format like "01_001_0107_1_1")
      const categoryCode = serviceCode.split("_")[0];

      if (!registration.serviceCategories.includes(categoryCode)) {
        return {
          valid: false,
          error: `Provider not registered for service category: ${categoryCode}`,
        };
      }
    }

    // Check registration expiry
    if (registration.expiresAt && registration.expiresAt < new Date()) {
      return {
        valid: false,
        error: "Provider registration has expired",
      };
    }

    return { valid: true };
  }

  /**
   * Validate category rules allow the service
   */
  async validateCategoryRules(
    categoryId: string,
    serviceCode: string
  ): Promise<{ valid: boolean; error?: string }> {
    const category = await prisma.budgetCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return { valid: false, error: "Category not found" };
    }

    const rules = (category.rules as any) || {};

    // Check if service is allowed in category rules
    if (rules.allowedServices && Array.isArray(rules.allowedServices)) {
      if (!rules.allowedServices.includes(serviceCode)) {
        return {
          valid: false,
          error: `Service ${serviceCode} not allowed in category ${category.categoryCode}`,
        };
      }
    }

    // Check if service is explicitly blocked
    if (rules.blockedServices && Array.isArray(rules.blockedServices)) {
      if (rules.blockedServices.includes(serviceCode)) {
        return {
          valid: false,
          error: `Service ${serviceCode} is blocked in category ${category.categoryCode}`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Validate time constraints (plan expiry, service windows)
   */
  async validateTimeConstraints(
    planId: string,
    transactionDate: Date = new Date()
  ): Promise<{ valid: boolean; error?: string }> {
    const plan = await prisma.nDISPlan.findUnique({
      where: { id: planId },
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!plan) {
      return { valid: false, error: "Plan not found" };
    }

    if (plan.status !== "ACTIVE") {
      return {
        valid: false,
        error: `Plan status is ${plan.status}, must be ACTIVE`,
      };
    }

    if (transactionDate < plan.startDate) {
      return {
        valid: false,
        error: `Transaction date is before plan start date`,
      };
    }

    if (transactionDate > plan.endDate) {
      return {
        valid: false,
        error: `Transaction date is after plan end date`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate worker has NDIS verification (if worker is involved)
   */
  async validateWorkerNDIS(
    workerId?: string
  ): Promise<{ valid: boolean; error?: string }> {
    if (!workerId) {
      return { valid: true }; // No worker involved
    }

    const result = await checkWorkerNDISVerification(workerId);
    if (!result.hasNDISVerification) {
      return {
        valid: false,
        error: `Worker does not have valid NDIS Worker Screening verification. Status: ${result.verificationStatus || "NOT_VERIFIED"}`,
      };
    }

    return { valid: true };
  }

  /**
   * Comprehensive validation for a payment
   */
  async validatePayment(params: {
    planId: string;
    categoryId: string;
    providerId: string;
    serviceCode: string;
    amount: number;
    transactionDate?: Date;
    workerId?: string; // Optional worker ID if worker is involved in service delivery
  }): Promise<ValidationResult> {
    const {
      planId,
      categoryId,
      providerId,
      serviceCode,
      amount,
      transactionDate = new Date(),
      workerId,
    } = params;

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate time constraints
    const timeValidation = await this.validateTimeConstraints(
      planId,
      transactionDate
    );
    if (!timeValidation.valid) {
      errors.push(timeValidation.error!);
    }

    // Validate price guide
    const priceValidation = await this.validatePriceGuide(serviceCode, amount);
    if (!priceValidation.valid) {
      errors.push(priceValidation.error!);
    }

    // Validate provider
    const providerValidation = await this.validateProvider(
      providerId,
      serviceCode
    );
    if (!providerValidation.valid) {
      errors.push(providerValidation.error!);
    }

    // Validate category rules
    const categoryValidation = await this.validateCategoryRules(
      categoryId,
      serviceCode
    );
    if (!categoryValidation.valid) {
      errors.push(categoryValidation.error!);
    }

    // Validate worker NDIS verification (if worker is involved)
    if (workerId) {
      const workerValidation = await this.validateWorkerNDIS(workerId);
      if (!workerValidation.valid) {
        errors.push(workerValidation.error!);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      priceGuideMatch: priceValidation.maxPrice
        ? {
            serviceCode,
            maxPrice: priceValidation.maxPrice,
            actualPrice: amount,
          }
        : undefined,
    };
  }
}
