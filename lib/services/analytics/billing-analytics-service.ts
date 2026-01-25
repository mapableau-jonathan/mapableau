/**
 * Billing Analytics Service
 * Provides revenue, cost, and profit analytics (Admin-Only)
 */

import { prisma } from "@/lib/prisma";
import { BaseAnalyticsService } from "./base-analytics-service";

export interface BillingAnalytics {
  totalRevenue: number;
  totalCosts: number;
  profit: number;
  profitMargin: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  revenueByPeriod: Array<{
    period: string;
    revenue: number;
    costs: number;
    profit: number;
  }>;
  revenueByUser: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    totalPaid: number;
    totalPending: number;
    invoiceCount: number;
  }>;
}

/**
 * Billing Analytics Service (Admin-Only)
 */
export class BillingAnalyticsService {
  private baseAnalytics: BaseAnalyticsService;

  constructor() {
    this.baseAnalytics = new BaseAnalyticsService();
  }

  /**
   * Get comprehensive billing analytics
   */
  async getBillingAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<BillingAnalytics> {
    try {
      const where = this.baseAnalytics.buildDateWhereClause(
        startDate,
        endDate,
        "createdAt"
      );

      // Get all invoices
      const invoices = await prisma.invoice.findMany({
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

      // Get usage costs
      const usageWhere = this.baseAnalytics.buildDateWhereClause(
        startDate,
        endDate,
        "createdAt"
      );

      const usageRecords = await prisma.usageRecord.findMany({
        where: usageWhere,
        select: {
          cost: true,
          createdAt: true,
        },
      });

      const totalCosts = this.baseAnalytics.calculateSum(
        usageRecords,
        "cost"
      );

      // Calculate revenue
      const paidInvoices = invoices.filter((inv) => inv.status === "PAID");
      const totalRevenue = this.baseAnalytics.calculateSum(
        paidInvoices,
        "totalAmount"
      );

      const profit = totalRevenue - totalCosts;
      const profitMargin = this.baseAnalytics.calculatePercentage(
        profit,
        totalRevenue
      );

      // Aggregate by user
      const userMap = new Map<string, {
        userId: string;
        userName: string;
        userEmail: string;
        totalPaid: number;
        totalPending: number;
        invoiceCount: number;
      }>();

      for (const invoice of invoices) {
        if (!userMap.has(invoice.userId)) {
          userMap.set(invoice.userId, {
            userId: invoice.userId,
            userName: invoice.user.name || "Unknown",
            userEmail: invoice.user.email,
            totalPaid: 0,
            totalPending: 0,
            invoiceCount: 0,
          });
        }

        const userData = userMap.get(invoice.userId)!;
        userData.invoiceCount++;

        if (invoice.status === "PAID") {
          userData.totalPaid += Number(invoice.totalAmount);
        } else if (invoice.status === "PENDING" || invoice.status === "OVERDUE") {
          userData.totalPending += Number(invoice.totalAmount);
        }
      }

      // Aggregate by period (monthly)
      const periodMap = new Map<string, {
        revenue: number;
        costs: number;
      }>();

      for (const invoice of paidInvoices) {
        const date = invoice.paidAt || invoice.createdAt;
        const periodKey = date.toISOString().substring(0, 7); // YYYY-MM

        if (!periodMap.has(periodKey)) {
          periodMap.set(periodKey, { revenue: 0, costs: 0 });
        }

        periodMap.get(periodKey)!.revenue += Number(invoice.totalAmount);
      }

      for (const record of usageRecords) {
        const periodKey = record.createdAt.toISOString().substring(0, 7);

        if (!periodMap.has(periodKey)) {
          periodMap.set(periodKey, { revenue: 0, costs: 0 });
        }

        periodMap.get(periodKey)!.costs += Number(record.cost);
      }

      const revenueByPeriod = Array.from(periodMap.entries())
        .map(([period, data]) => ({
          period,
          revenue: data.revenue,
          costs: data.costs,
          profit: data.revenue - data.costs,
        }))
        .sort((a, b) => a.period.localeCompare(b.period));

      return {
        totalRevenue,
        totalCosts,
        profit,
        profitMargin,
        totalInvoices: invoices.length,
        paidInvoices: paidInvoices.length,
        pendingInvoices: invoices.filter((inv) => inv.status === "PENDING").length,
        overdueInvoices: invoices.filter((inv) => inv.status === "OVERDUE").length,
        revenueByPeriod,
        revenueByUser: Array.from(userMap.values()).sort(
          (a, b) => b.totalPaid - a.totalPaid
        ),
      };
    } catch (error) {
      this.baseAnalytics.handleAnalyticsError(
        error,
        "BillingAnalyticsService",
        "getBillingAnalytics"
      );
    }
  }

  /**
   * Get revenue forecast
   */
  async getRevenueForecast(months: number = 12): Promise<Array<{
    month: string;
    projectedRevenue: number;
    projectedCosts: number;
    projectedProfit: number;
  }>> {
    try {
      // Get historical data for last 3 months
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);

      const analytics = await this.getBillingAnalytics(startDate, endDate);

      // Calculate average monthly revenue and costs
      const avgMonthlyRevenue = analytics.totalRevenue / 3;
      const avgMonthlyCosts = analytics.totalCosts / 3;

      // Generate forecast
      const forecast = [];
      for (let i = 1; i <= months; i++) {
        const forecastDate = new Date();
        forecastDate.setMonth(forecastDate.getMonth() + i);

        forecast.push({
          month: forecastDate.toISOString().substring(0, 7),
          projectedRevenue: avgMonthlyRevenue,
          projectedCosts: avgMonthlyCosts,
          projectedProfit: avgMonthlyRevenue - avgMonthlyCosts,
        });
      }

      return forecast;
    } catch (error) {
      this.baseAnalytics.handleAnalyticsError(
        error,
        "BillingAnalyticsService",
        "getRevenueForecast"
      );
    }
  }
}

// Export singleton instance
export const billingAnalyticsService = new BillingAnalyticsService();
