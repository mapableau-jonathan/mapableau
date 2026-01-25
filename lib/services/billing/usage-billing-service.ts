/**
 * Usage Billing Service
 * Generates invoices from usage records and manages billing periods
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { billingCalculator, BillingCalculationResult } from "./billing-calculator";
import { BillingService, type CreateInvoiceInput } from "../core/billing-service";

export interface BillingPeriodConfig {
  periodDays: number;
  autoGenerateInvoices: boolean;
  autoChargeInvoices: boolean;
}

/**
 * Usage Billing Service
 */
export class UsageBillingService {
  private billingService: BillingService;

  constructor() {
    this.billingService = new BillingService();
  }

  /**
   * Get or create current billing period for user
   */
  async getOrCreateCurrentPeriod(userId: string): Promise<{
    id: string;
    startDate: Date;
    endDate: Date;
    status: string;
  }> {
    const periodDays = parseInt(process.env.BILLING_PERIOD_DAYS || "30", 10);
    const now = new Date();
    const startOfPeriod = new Date(now);
    startOfPeriod.setDate(1); // Start of month
    startOfPeriod.setHours(0, 0, 0, 0);

    const endOfPeriod = new Date(startOfPeriod);
    endOfPeriod.setMonth(endOfPeriod.getMonth() + 1);
    endOfPeriod.setDate(0); // Last day of month
    endOfPeriod.setHours(23, 59, 59, 999);

    // Find existing open period
    const existing = await prisma.usageBillingPeriod.findFirst({
      where: {
        userId,
        status: "OPEN",
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });

    if (existing) {
      return existing;
    }

    // Create new period
    const period = await prisma.usageBillingPeriod.create({
      data: {
        userId,
        startDate: startOfPeriod,
        endDate: endOfPeriod,
        status: "OPEN",
        totalCost: 0,
      },
    });

    return period;
  }

  /**
   * Close billing period and generate invoice
   */
  async closeBillingPeriod(
    periodId: string,
    autoGenerateInvoice = true
  ): Promise<{ period: any; invoice?: any }> {
    try {
      const period = await prisma.usageBillingPeriod.findUnique({
        where: { id: periodId },
        include: {
          usageRecords: true,
        },
      });

      if (!period) {
        throw new Error("Billing period not found");
      }

      if (period.status !== "OPEN") {
        throw new Error("Billing period is not open");
      }

      // Calculate total cost
      const calculation = await billingCalculator.calculateBilling(
        period.userId,
        period.startDate,
        period.endDate
      );

      // Update period
      const updatedPeriod = await prisma.usageBillingPeriod.update({
        where: { id: periodId },
        data: {
          status: "CLOSED",
          totalCost: calculation.total,
          closedAt: new Date(),
        },
      });

      let invoice = null;

      // Generate invoice if requested
      if (autoGenerateInvoice && calculation.total > 0) {
        invoice = await this.generateInvoiceFromPeriod(periodId, calculation);
      }

      logger.info("Billing period closed", {
        periodId,
        userId: period.userId,
        totalCost: calculation.total,
        invoiceId: invoice?.id,
      });

      return { period: updatedPeriod, invoice };
    } catch (error) {
      logger.error("Error closing billing period", { error, periodId });
      throw error;
    }
  }

  /**
   * Generate invoice from billing period
   */
  async generateInvoiceFromPeriod(
    periodId: string,
    calculation?: BillingCalculationResult
  ): Promise<any> {
    try {
      const period = await prisma.usageBillingPeriod.findUnique({
        where: { id: periodId },
        include: {
          usageRecords: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!period) {
        throw new Error("Billing period not found");
      }

      // Calculate if not provided
      if (!calculation) {
        calculation = await billingCalculator.calculateBilling(
          period.userId,
          period.startDate,
          period.endDate
        );
      }

      // Create line items from breakdown
      const lineItems = [
        {
          description: "API Calls",
          quantity: calculation.breakdown.apiCalls.quantity,
          unitPrice: calculation.breakdown.apiCalls.cost / calculation.breakdown.apiCalls.quantity || 0,
          total: calculation.breakdown.apiCalls.cost,
          serviceType: "api",
        },
        {
          description: "Service Hours",
          quantity: calculation.breakdown.serviceHours.quantity,
          unitPrice: calculation.breakdown.serviceHours.cost / calculation.breakdown.serviceHours.quantity || 0,
          total: calculation.breakdown.serviceHours.cost,
          serviceType: "service",
        },
        {
          description: "Storage (GB)",
          quantity: calculation.breakdown.storage.quantity,
          unitPrice: calculation.breakdown.storage.cost / calculation.breakdown.storage.quantity || 0,
          total: calculation.breakdown.storage.cost,
          serviceType: "storage",
        },
      ].filter((item) => item.quantity > 0);

      // Create invoice
      const invoiceInput: CreateInvoiceInput = {
        userId: period.userId,
        amount: calculation.subtotal,
        taxAmount: calculation.tax,
        currency: calculation.currency,
        dueDate: new Date(Date.now() + parseInt(process.env.INVOICE_DUE_DAYS || "14", 10) * 24 * 60 * 60 * 1000),
        lineItems,
        metadata: {
          billingPeriodId: periodId,
          startDate: period.startDate.toISOString(),
          endDate: period.endDate.toISOString(),
          breakdown: calculation.breakdown,
          isUsageBased: true,
        },
      };

      const invoice = await this.billingService.createInvoice(invoiceInput);

      // Link invoice to period
      await prisma.usageBillingPeriod.update({
        where: { id: periodId },
        data: {
          invoiceId: invoice.id,
          status: "INVOICED",
        },
      });

      logger.info("Invoice generated from billing period", {
        periodId,
        invoiceId: invoice.id,
        amount: calculation.total,
      });

      return invoice;
    } catch (error) {
      logger.error("Error generating invoice from period", { error, periodId });
      throw error;
    }
  }

  /**
   * Process all open billing periods (cron job)
   */
  async processOpenPeriods(): Promise<{
    processed: number;
    invoicesGenerated: number;
    errors: number;
  }> {
    const autoGenerate = process.env.AUTO_GENERATE_INVOICES === "true";

    const openPeriods = await prisma.usageBillingPeriod.findMany({
      where: {
        status: "OPEN",
        endDate: { lte: new Date() },
      },
    });

    let processed = 0;
    let invoicesGenerated = 0;
    let errors = 0;

    for (const period of openPeriods) {
      try {
        const result = await this.closeBillingPeriod(period.id, autoGenerate);
        processed++;
        if (result.invoice) {
          invoicesGenerated++;
        }
      } catch (error) {
        logger.error("Error processing billing period", { error, periodId: period.id });
        errors++;
      }
    }

    logger.info("Processed open billing periods", {
      processed,
      invoicesGenerated,
      errors,
      total: openPeriods.length,
    });

    return { processed, invoicesGenerated, errors };
  }

  /**
   * Get billing period summary
   */
  async getPeriodSummary(periodId: string): Promise<{
    period: any;
    calculation: BillingCalculationResult;
    invoice?: any;
  }> {
    const period = await prisma.usageBillingPeriod.findUnique({
      where: { id: periodId },
      include: {
        invoice: true,
        usageRecords: {
          take: 100, // Limit for performance
        },
      },
    });

    if (!period) {
      throw new Error("Billing period not found");
    }

    const calculation = await billingCalculator.calculateBilling(
      period.userId,
      period.startDate,
      period.endDate
    );

    return {
      period,
      calculation,
      invoice: period.invoice || undefined,
    };
  }
}

// Export singleton instance
export const usageBillingService = new UsageBillingService();
