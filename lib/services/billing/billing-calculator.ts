/**
 * Billing Calculator
 * Calculates costs from usage records and applies rates
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { UsageType } from "../usage/usage-tracker";

export interface BillingCalculationResult {
  totalCost: number;
  breakdown: {
    apiCalls: { quantity: number; cost: number };
    serviceHours: { quantity: number; cost: number; byServiceType: Record<string, number> };
    storage: { quantity: number; cost: number };
  };
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
}

export interface BillingRate {
  apiCallRate: number;
  serviceRates: Record<string, number>;
  storageRatePerGB: number;
  taxRate?: number;
}

/**
 * Billing Calculator
 */
export class BillingCalculator {
  /**
   * Calculate billing from usage records
   */
  async calculateBilling(
    userId: string,
    startDate: Date,
    endDate: Date,
    rates?: BillingRate
  ): Promise<BillingCalculationResult> {
    try {
      const usageRates = rates || (await this.getDefaultRates());

      // Get all usage records for the period
      const records = await prisma.usageRecord.findMany({
        where: {
          userId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          usageType: true,
          quantity: true,
          cost: true,
          metadata: true,
        },
      });

      const breakdown = {
        apiCalls: { quantity: 0, cost: 0 },
        serviceHours: { quantity: 0, cost: 0, byServiceType: {} as Record<string, number> },
        storage: { quantity: 0, cost: 0 },
      };

      let totalCost = 0;

      for (const record of records) {
        const quantity = Number(record.quantity);
        const cost = Number(record.cost);
        totalCost += cost;

        switch (record.usageType) {
          case UsageType.API_CALL:
            breakdown.apiCalls.quantity += quantity;
            breakdown.apiCalls.cost += cost;
            break;

          case UsageType.SERVICE_HOUR:
            breakdown.serviceHours.quantity += quantity;
            breakdown.serviceHours.cost += cost;

            // Track by service type
            const metadata = record.metadata as any;
            const serviceType = metadata?.serviceType || "default";
            breakdown.serviceHours.byServiceType[serviceType] =
              (breakdown.serviceHours.byServiceType[serviceType] || 0) + quantity;
            break;

          case UsageType.STORAGE_GB:
            breakdown.storage.quantity += quantity;
            breakdown.storage.cost += cost;
            break;
        }
      }

      const subtotal = totalCost;
      const taxRate = usageRates.taxRate || 0.1; // 10% default GST
      const tax = subtotal * taxRate;
      const total = subtotal + tax;

      return {
        totalCost,
        breakdown,
        subtotal,
        tax,
        total,
        currency: "AUD",
      };
    } catch (error) {
      logger.error("Error calculating billing", { error, userId, startDate, endDate });
      throw error;
    }
  }

  /**
   * Calculate billing for a billing period
   */
  async calculateBillingPeriod(
    billingPeriodId: string
  ): Promise<BillingCalculationResult> {
    const period = await prisma.usageBillingPeriod.findUnique({
      where: { id: billingPeriodId },
      select: {
        userId: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!period) {
      throw new Error("Billing period not found");
    }

    return this.calculateBilling(period.userId, period.startDate, period.endDate);
  }

  /**
   * Apply discount to billing calculation
   */
  applyDiscount(
    calculation: BillingCalculationResult,
    discountType: "percentage" | "fixed",
    discountValue: number
  ): BillingCalculationResult {
    let discountAmount = 0;

    if (discountType === "percentage") {
      discountAmount = calculation.subtotal * (discountValue / 100);
    } else {
      discountAmount = Math.min(discountValue, calculation.subtotal);
    }

    const newSubtotal = calculation.subtotal - discountAmount;
    const newTax = newSubtotal * (calculation.tax / calculation.subtotal);
    const newTotal = newSubtotal + newTax;

    return {
      ...calculation,
      subtotal: newSubtotal,
      tax: newTax,
      total: newTotal,
    };
  }

  /**
   * Apply tiered pricing
   */
  async calculateTieredPricing(
    userId: string,
    startDate: Date,
    endDate: Date,
    tiers: Array<{ min: number; max?: number; rate: number }>
  ): Promise<number> {
    const records = await prisma.usageRecord.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        usageType: true,
        quantity: true,
      },
    });

    let totalCost = 0;

    // Group by usage type and apply tiered pricing
    const usageByType: Record<string, number> = {};
    for (const record of records) {
      usageByType[record.usageType] =
        (usageByType[record.usageType] || 0) + Number(record.quantity);
    }

    // Apply tiered pricing to each usage type
    for (const [usageType, quantity] of Object.entries(usageByType)) {
      let remaining = quantity;

      for (const tier of tiers) {
        if (remaining <= 0) break;

        const tierQuantity = tier.max
          ? Math.min(remaining, tier.max - tier.min)
          : remaining;

        if (tierQuantity > 0) {
          totalCost += tierQuantity * tier.rate;
          remaining -= tierQuantity;
        }
      }
    }

    return totalCost;
  }

  /**
   * Get default billing rates
   */
  private async getDefaultRates(): Promise<BillingRate> {
    return {
      apiCallRate: parseFloat(process.env.API_CALL_COST || "0.001"),
      serviceRates: {
        care: parseFloat(process.env.HOURLY_RATE_SERVICE_CARE || "50.00"),
        transport: parseFloat(process.env.HOURLY_RATE_SERVICE_TRANSPORT || "30.00"),
        default: parseFloat(process.env.HOURLY_RATE_SERVICE_CARE || "50.00"),
      },
      storageRatePerGB: parseFloat(process.env.STORAGE_COST_PER_GB || "0.10"),
      taxRate: parseFloat(process.env.TAX_RATE || "0.10"), // 10% GST
    };
  }
}

// Export singleton instance
export const billingCalculator = new BillingCalculator();
