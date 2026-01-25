/**
 * Payment Analytics Service
 * Provides payment provider performance analytics (Admin-Only)
 */

import { prisma } from "@/lib/prisma";
import { BaseAnalyticsService } from "./base-analytics-service";

export interface PaymentAnalytics {
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  totalVolume: number;
  successRate: number;
  byProvider: {
    stripe: { count: number; volume: number; successRate: number };
    paypal: { count: number; volume: number; successRate: number };
    npp: { count: number; volume: number; successRate: number };
    coinbase: { count: number; volume: number; successRate: number };
  };
  byStatus: Record<string, number>;
  averageTransactionAmount: number;
  refunds: {
    count: number;
    totalAmount: number;
  };
  trends: Array<{
    date: string;
    count: number;
    volume: number;
    successRate: number;
  }>;
}

/**
 * Payment Analytics Service (Admin-Only)
 */
export class PaymentAnalyticsService {
  private baseAnalytics: BaseAnalyticsService;

  constructor() {
    this.baseAnalytics = new BaseAnalyticsService();
  }

  /**
   * Get comprehensive payment analytics
   */
  async getPaymentAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<PaymentAnalytics> {
    try {
      const where = this.baseAnalytics.buildDateWhereClause(
        startDate,
        endDate,
        "createdAt"
      );

      // Get payment transactions
      const transactions = await prisma.paymentTransaction.findMany({
        where,
        select: {
          amount: true,
          status: true,
          validationResult: true,
          createdAt: true,
        },
      });

      const analytics: PaymentAnalytics = {
        totalPayments: transactions.length,
        successfulPayments: 0,
        failedPayments: 0,
        totalVolume: 0,
        successRate: 0,
        byProvider: {
          stripe: { count: 0, volume: 0, successRate: 0 },
          paypal: { count: 0, volume: 0, successRate: 0 },
          npp: { count: 0, volume: 0, successRate: 0 },
          coinbase: { count: 0, volume: 0, successRate: 0 },
        },
        byStatus: {},
        averageTransactionAmount: 0,
        refunds: {
          count: 0,
          totalAmount: 0,
        },
        trends: [],
      };

      const dateMap = new Map<string, {
        count: number;
        volume: number;
        successful: number;
      }>();

      for (const transaction of transactions) {
        const amount = Number(transaction.amount);
        analytics.totalVolume += amount;

        // Count by status
        analytics.byStatus[transaction.status] =
          (analytics.byStatus[transaction.status] || 0) + 1;

        if (transaction.status === "COMPLETED") {
          analytics.successfulPayments++;
        } else if (transaction.status === "FAILED") {
          analytics.failedPayments++;
        }

        // Get provider from validation result
        const validationResult = transaction.validationResult as any;
        const provider = validationResult?.paymentMethod?.toLowerCase() || "unknown";

        if (provider in analytics.byProvider) {
          const providerData = analytics.byProvider[provider as keyof typeof analytics.byProvider];
          providerData.count++;
          if (transaction.status === "COMPLETED") {
            providerData.volume += amount;
          }
        }

        // Track by date
        const dateKey = transaction.createdAt.toISOString().split("T")[0];
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, { count: 0, volume: 0, successful: 0 });
        }

        const dateData = dateMap.get(dateKey)!;
        dateData.count++;
        if (transaction.status === "COMPLETED") {
          dateData.volume += amount;
          dateData.successful++;
        }
      }

      // Calculate success rates using base utility
      analytics.successRate = this.baseAnalytics.calculatePercentage(
        analytics.successfulPayments,
        analytics.totalPayments
      );

      analytics.averageTransactionAmount =
        analytics.totalPayments > 0
          ? analytics.totalVolume / analytics.totalPayments
          : 0;

      // Calculate provider success rates
      for (const [provider, data] of Object.entries(analytics.byProvider)) {
        data.successRate = this.baseAnalytics.calculatePercentage(
          data.volume,
          data.count
        );
      }

      // Build trends
      analytics.trends = Array.from(dateMap.entries())
        .map(([date, data]) => ({
          date,
          count: data.count,
          volume: data.volume,
          successRate: this.baseAnalytics.calculatePercentage(
            data.successful,
            data.count
          ),
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Get refunds (from invoices)
      const refundedInvoices = await prisma.invoice.findMany({
        where: {
          ...where,
          status: "REFUNDED",
        },
        select: {
          totalAmount: true,
        },
      });

      analytics.refunds = {
        count: refundedInvoices.length,
        totalAmount: this.baseAnalytics.calculateSum(
          refundedInvoices,
          "totalAmount"
        ),
      };

      return analytics;
    } catch (error) {
      this.baseAnalytics.handleAnalyticsError(
        error,
        "PaymentAnalyticsService",
        "getPaymentAnalytics"
      );
    }
  }

  /**
   * Get payment method preferences
   */
  async getPaymentMethodPreferences(
    startDate?: Date,
    endDate?: Date
  ): Promise<Record<string, number>> {
    const where = this.baseAnalytics.buildDateWhereClause(
      startDate,
      endDate,
      "createdAt"
    );

    const invoices = await prisma.invoice.findMany({
      where: {
        ...where,
        status: "PAID",
      },
      select: {
        paymentMethod: true,
      },
    });

    const preferences: Record<string, number> = {};
    for (const invoice of invoices) {
      if (invoice.paymentMethod) {
        preferences[invoice.paymentMethod] =
          (preferences[invoice.paymentMethod] || 0) + 1;
      }
    }

    return preferences;
  }
}

// Export singleton instance
export const paymentAnalyticsService = new PaymentAnalyticsService();
