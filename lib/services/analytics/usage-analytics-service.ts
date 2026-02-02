/**
 * Usage Analytics Service
 * 
 * Provides comprehensive usage analytics and metrics for administrative use.
 * Tracks API calls, service hours, and storage usage across all users and provides
 * cost analysis and trend reporting.
 * 
 * @example
 * ```typescript
 * const analyticsService = new UsageAnalyticsService();
 * const analytics = await analyticsService.getUsageAnalytics(
 *   new Date('2024-01-01'),
 *   new Date('2024-12-31')
 * );
 * ```
 * 
 * @requires Admin role for access
 * @uses BaseAnalyticsService for common analytics utilities
 */

// Internal utilities
import { prisma } from "@/lib/prisma";

// Local relative imports
import { UsageType } from "../usage/usage-tracker";
import { BaseAnalyticsService } from "./base-analytics-service";

export interface UsageAnalytics {
  totalUsers: number;
  activeUsers: number;
  totalApiCalls: number;
  totalServiceHours: number;
  totalStorageGB: number;
  totalCost: number;
  byUser: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    apiCalls: number;
    serviceHours: number;
    storageGB: number;
    cost: number;
  }>;
  byType: {
    apiCalls: { quantity: number; cost: number };
    serviceHours: { quantity: number; cost: number };
    storage: { quantity: number; cost: number };
  };
  trends: Array<{
    date: string;
    apiCalls: number;
    serviceHours: number;
    storageGB: number;
    cost: number;
  }>;
}

/**
 * Usage Analytics Service (Admin-Only)
 * 
 * Provides usage analytics and metrics tracking API calls, service hours, and storage.
 * Aggregates usage data by user, type, and time period for cost analysis.
 */
export class UsageAnalyticsService {
  private baseAnalytics: BaseAnalyticsService;

  constructor() {
    this.baseAnalytics = new BaseAnalyticsService();
  }

  /**
   * Get comprehensive usage analytics
   * 
   * Aggregates usage data across all users and types (API calls, service hours, storage)
   * and calculates costs and trends for the specified date range.
   * 
   * @param startDate - Optional start date for analytics period
   * @param endDate - Optional end date for analytics period
   * @param userId - Optional user ID to filter analytics for specific user
   * @returns Promise resolving to UsageAnalytics with all usage metrics
   * @throws Error if analytics calculation fails
   */
  async getUsageAnalytics(
    startDate?: Date,
    endDate?: Date,
    userId?: string
  ): Promise<UsageAnalytics> {
    try {
      const dateWhere = this.baseAnalytics.buildDateWhereClause(
        startDate,
        endDate,
        "createdAt"
      );
      const where: any = {
        ...dateWhere,
        ...(userId && { userId }),
      };

      // Get all usage records
      const records = await prisma.usageRecord.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Aggregate data
      const analytics: UsageAnalytics = {
        totalUsers: 0,
        activeUsers: 0,
        totalApiCalls: 0,
        totalServiceHours: 0,
        totalStorageGB: 0,
        totalCost: 0,
        byUser: [],
        byType: {
          apiCalls: { quantity: 0, cost: 0 },
          serviceHours: { quantity: 0, cost: 0 },
          storage: { quantity: 0, cost: 0 },
        },
        trends: [],
      };

      const userMap = new Map<string, {
        userId: string;
        userName: string;
        userEmail: string;
        apiCalls: number;
        serviceHours: number;
        storageGB: number;
        cost: number;
      }>();

      const dateMap = new Map<string, {
        apiCalls: number;
        serviceHours: number;
        storageGB: number;
        cost: number;
      }>();

      // Calculate total cost using base utility
      analytics.totalCost = this.baseAnalytics.calculateSum(records, "cost");
      
      for (const record of records) {
        const quantity = Number(record.quantity);
        const cost = Number(record.cost);

        // Aggregate by type
        switch (record.usageType) {
          case UsageType.API_CALL:
            analytics.totalApiCalls += quantity;
            analytics.byType.apiCalls.quantity += quantity;
            analytics.byType.apiCalls.cost += cost;
            break;
          case UsageType.SERVICE_HOUR:
            analytics.totalServiceHours += quantity;
            analytics.byType.serviceHours.quantity += quantity;
            analytics.byType.serviceHours.cost += cost;
            break;
          case UsageType.STORAGE_GB:
            analytics.totalStorageGB += quantity;
            analytics.byType.storage.quantity += quantity;
            analytics.byType.storage.cost += cost;
            break;
        }

        // Aggregate by user
        if (!userMap.has(record.userId)) {
          userMap.set(record.userId, {
            userId: record.userId,
            userName: record.user.name || "Unknown",
            userEmail: record.user.email,
            apiCalls: 0,
            serviceHours: 0,
            storageGB: 0,
            cost: 0,
          });
        }

        const userData = userMap.get(record.userId)!;
        userData.cost += cost;

        switch (record.usageType) {
          case UsageType.API_CALL:
            userData.apiCalls += quantity;
            break;
          case UsageType.SERVICE_HOUR:
            userData.serviceHours += quantity;
            break;
          case UsageType.STORAGE_GB:
            userData.storageGB += quantity;
            break;
        }

        // Aggregate by date
        const dateKey = record.createdAt.toISOString().split("T")[0];
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, {
            apiCalls: 0,
            serviceHours: 0,
            storageGB: 0,
            cost: 0,
          });
        }

        const dateData = dateMap.get(dateKey)!;
        dateData.cost += cost;

        switch (record.usageType) {
          case UsageType.API_CALL:
            dateData.apiCalls += quantity;
            break;
          case UsageType.SERVICE_HOUR:
            dateData.serviceHours += quantity;
            break;
          case UsageType.STORAGE_GB:
            dateData.storageGB += quantity;
            break;
        }
      }

      analytics.totalUsers = userMap.size;
      analytics.activeUsers = Array.from(userMap.values()).filter(
        (u) => u.cost > 0
      ).length;
      analytics.byUser = Array.from(userMap.values()).sort(
        (a, b) => b.cost - a.cost
      );
      analytics.trends = Array.from(dateMap.entries())
        .map(([date, data]) => ({
          date,
          ...data,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return analytics;
    } catch (error) {
      this.baseAnalytics.handleAnalyticsError(
        error,
        "UsageAnalyticsService",
        "getUsageAnalytics"
      );
    }
  }

  /**
   * Get usage summary for specific user (admin view)
   */
  async getUserUsageAnalytics(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalCost: number;
    breakdown: {
      apiCalls: { quantity: number; cost: number };
      serviceHours: { quantity: number; cost: number };
      storage: { quantity: number; cost: number };
    };
    periods: Array<{
      periodId: string;
      startDate: Date;
      endDate: Date;
      totalCost: number;
      invoiceId?: string;
    }>;
  }> {
    const dateWhere = this.baseAnalytics.buildDateWhereClause(
      startDate,
      endDate,
      "createdAt"
    );
    const where: any = {
      userId,
      ...dateWhere,
    };

    const records = await prisma.usageRecord.findMany({
      where,
      select: {
        usageType: true,
        quantity: true,
        cost: true,
        billingPeriodId: true,
      },
    });

    const breakdown = {
      apiCalls: { quantity: 0, cost: 0 },
      serviceHours: { quantity: 0, cost: 0 },
      storage: { quantity: 0, cost: 0 },
    };

    // Calculate total cost using base utility
    const totalCost = this.baseAnalytics.calculateSum(records, "cost");

    for (const record of records) {
      const quantity = Number(record.quantity);
      const cost = Number(record.cost);

      switch (record.usageType) {
        case UsageType.API_CALL:
          breakdown.apiCalls.quantity += quantity;
          breakdown.apiCalls.cost += cost;
          break;
        case UsageType.SERVICE_HOUR:
          breakdown.serviceHours.quantity += quantity;
          breakdown.serviceHours.cost += cost;
          break;
        case UsageType.STORAGE_GB:
          breakdown.storage.quantity += quantity;
          breakdown.storage.cost += cost;
          break;
      }
    }

    // Get billing periods
    const periods = await prisma.usageBillingPeriod.findMany({
      where: { userId },
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        totalCost: true,
        invoiceId: true,
      },
    });

    return {
      totalCost,
      breakdown,
      periods: periods.map((p) => ({
        periodId: p.id,
        startDate: p.startDate,
        endDate: p.endDate,
        totalCost: Number(p.totalCost),
        invoiceId: p.invoiceId || undefined,
      })),
    };
  }
}

// Export singleton instance
export const usageAnalyticsService = new UsageAnalyticsService();
