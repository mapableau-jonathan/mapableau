/**
 * NDIA Provider Registry Integration
 * Validates and syncs provider registration information
 */

import { NDIAApiClient, type NDIAProvider } from "./api-client";
import { prisma } from "../../prisma";
import { logger } from "@/lib/logger";

export class ProviderRegistryService {
  private ndiaClient: NDIAApiClient;

  constructor() {
    this.ndiaClient = new NDIAApiClient();
  }

  /**
   * Verify provider registration
   */
  async verifyProvider(providerNumber: string): Promise<{
    valid: boolean;
    provider?: NDIAProvider;
    message?: string;
  }> {
    try {
      const result = await this.ndiaClient.verifyProvider(providerNumber);
      
      if (result.valid) {
        const provider = await this.ndiaClient.getProvider(providerNumber);
        return {
          valid: true,
          provider: provider || undefined,
          message: result.message,
        };
      }

      return {
        valid: false,
        message: result.message,
      };
    } catch (error) {
      logger.error("Error verifying provider", error);
      return {
        valid: false,
        message: "Error verifying provider registration",
      };
    }
  }

  /**
   * Sync provider registration to local database
   */
  async syncProviderRegistration(
    userId: string,
    providerNumber: string
  ): Promise<{
    success: boolean;
    registration?: any;
    error?: string;
  }> {
    try {
      const verification = await this.verifyProvider(providerNumber);

      if (!verification.valid || !verification.provider) {
        return {
          success: false,
          error: verification.message || "Provider verification failed",
        };
      }

      const provider = verification.provider;

      // Check if registration already exists
      const existing = await prisma.providerRegistration.findUnique({
        where: { userId },
      });

      const registrationData = {
        providerNumber: provider.providerNumber,
        registrationStatus: this.mapStatus(provider.status),
        serviceCategories: provider.serviceCategories,
        verifiedAt: new Date(),
        expiresAt: provider.expiryDate
          ? new Date(provider.expiryDate)
          : null,
      };

      let registration;
      if (existing) {
        registration = await prisma.providerRegistration.update({
          where: { id: existing.id },
          data: registrationData,
        });
      } else {
        registration = await prisma.providerRegistration.create({
          data: {
            ...registrationData,
            userId,
          },
        });
      }

      logger.info("Provider registration synchronized", {
        userId,
        providerNumber,
      });

      return {
        success: true,
        registration,
      };
    } catch (error) {
      logger.error("Error syncing provider registration", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Map NDIA provider status to our status enum
   */
  private mapStatus(
    ndiaStatus: string
  ): "PENDING" | "ACTIVE" | "SUSPENDED" | "EXPIRED" | "REVOKED" {
    const statusMap: Record<
      string,
      "PENDING" | "ACTIVE" | "SUSPENDED" | "EXPIRED" | "REVOKED"
    > = {
      ACTIVE: "ACTIVE",
      REGISTERED: "ACTIVE",
      PENDING: "PENDING",
      SUSPENDED: "SUSPENDED",
      EXPIRED: "EXPIRED",
      REVOKED: "REVOKED",
    };

    return statusMap[ndiaStatus] || "PENDING";
  }

  /**
   * Validate service category against provider's registered categories
   */
  async validateServiceCategory(
    providerNumber: string,
    serviceCategory: string
  ): Promise<{
    valid: boolean;
    message?: string;
  }> {
    try {
      const provider = await this.ndiaClient.getProvider(providerNumber);

      if (!provider) {
        return {
          valid: false,
          message: "Provider not found",
        };
      }

      const valid = provider.serviceCategories.includes(serviceCategory);

      return {
        valid,
        message: valid
          ? "Service category is valid"
          : "Provider is not registered for this service category",
      };
    } catch (error) {
      logger.error("Error validating service category", error);
      return {
        valid: false,
        message: "Error validating service category",
      };
    }
  }
}
