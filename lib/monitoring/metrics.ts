/**
 * Metrics Collection Service
 * Tracks system performance and business metrics
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export interface PaymentMetrics {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalVolume: number;
  averageTransactionAmount: number;
  transactionsByMethod: Record<string, number>;
  transactionsByStatus: Record<string, number>;
}

export interface SystemMetrics {
  apiResponseTime: number;
  databaseQueryTime: number;
  blockchainConfirmationTime: number;
  errorRate: number;
  activeUsers: number;
  paymentSuccessRate: number;
}

export class MetricsService {
  private metricsCache: Map<string, { value: any; timestamp: number }> = new Map();
  private cacheTTL = 60000; // 1 minute cache

  /**
   * Get payment metrics
   */
  async getPaymentMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<PaymentMetrics> {
    const cacheKey = `payment-metrics-${startDate?.toISOString()}-${endDate?.toISOString()}`;
    const cached = this.metricsCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.value;
    }

    try {
      const where: any = {};
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const transactions = await prisma.paymentTransaction.findMany({
        where,
        select: {
          amount: true,
          status: true,
          validationResult: true,
        },
      });

      const totalTransactions = transactions.length;
      const successfulTransactions = transactions.filter(
        (t) => t.status === "COMPLETED"
      ).length;
      const failedTransactions = transactions.filter(
        (t) => t.status === "FAILED"
      ).length;

      const totalVolume = transactions.reduce(
        (sum, t) => sum + Number(t.amount),
        0
      );

      const averageTransactionAmount =
        totalTransactions > 0 ? totalVolume / totalTransactions : 0;

      // Group by payment method
      const transactionsByMethod: Record<string, number> = {};
      transactions.forEach((t) => {
        const method =
          (t.validationResult as any)?.paymentMethod || "blockchain";
        transactionsByMethod[method] = (transactionsByMethod[method] || 0) + 1;
      });

      // Group by status
      const transactionsByStatus: Record<string, number> = {};
      transactions.forEach((t) => {
        transactionsByStatus[t.status] =
          (transactionsByStatus[t.status] || 0) + 1;
      });

      const metrics: PaymentMetrics = {
        totalTransactions,
        successfulTransactions,
        failedTransactions,
        totalVolume,
        averageTransactionAmount,
        transactionsByMethod,
        transactionsByStatus,
      };

      this.metricsCache.set(cacheKey, {
        value: metrics,
        timestamp: Date.now(),
      });

      return metrics;
    } catch (error) {
      logger.error("Error fetching payment metrics", error);
      throw error;
    }
  }

  /**
   * Get system metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const cacheKey = "system-metrics";
    const cached = this.metricsCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.value;
    }

    try {
      // Get recent transactions for success rate calculation
      const recentTransactions = await prisma.paymentTransaction.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
        select: {
          status: true,
        },
        take: 1000,
      });

      const total = recentTransactions.length;
      const successful = recentTransactions.filter(
        (t) => t.status === "COMPLETED"
      ).length;
      const paymentSuccessRate = total > 0 ? successful / total : 0;

      // Get active users (users with transactions in last 24 hours)
      const activeUsers = await prisma.user.count({
        where: {
          OR: [
            {
              participantPayments: {
                some: {
                  createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                  },
                },
              },
            },
            {
              providerPayments: {
                some: {
                  createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                  },
                },
              },
            },
          ],
        },
      });

      // These would be tracked in real-time in production
      // For now, return placeholder values
      const metrics: SystemMetrics = {
        apiResponseTime: 0, // Would be tracked via middleware
        databaseQueryTime: 0, // Would be tracked via Prisma middleware
        blockchainConfirmationTime: 0, // Would be tracked in blockchain adapters
        errorRate: 0, // Would be tracked via error logging
        activeUsers,
        paymentSuccessRate,
      };

      this.metricsCache.set(cacheKey, {
        value: metrics,
        timestamp: Date.now(),
      });

      return metrics;
    } catch (error) {
      logger.error("Error fetching system metrics", error);
      throw error;
    }
  }

  /**
   * Track API response time
   */
  trackResponseTime(endpoint: string, duration: number): void {
    // In production, send to metrics service (DataDog, New Relic, etc.)
    logger.debug("API response time", {
      endpoint,
      duration,
      unit: "ms",
    });
  }

  /**
   * Track database query time
   */
  trackQueryTime(query: string, duration: number): void {
    // In production, send to metrics service
    logger.debug("Database query time", {
      query: query.substring(0, 100), // Truncate long queries
      duration,
      unit: "ms",
    });
  }

  /**
   * Track blockchain transaction
   */
  trackBlockchainTransaction(
    network: string,
    txHash: string,
    confirmationTime: number
  ): void {
    logger.info("Blockchain transaction confirmed", {
      network,
      txHash,
      confirmationTime,
      unit: "ms",
    });
  }

  /**
   * Track error
   */
  trackError(error: Error, context?: Record<string, unknown>): void {
    logger.error("System error", error, context);
  }

  /**
   * Clear metrics cache
   */
  clearCache(): void {
    this.metricsCache.clear();
  }
}

export const metricsService = new MetricsService();
