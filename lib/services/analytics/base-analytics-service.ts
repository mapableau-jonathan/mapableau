/**
 * Base Analytics Service
 * Provides common utilities for analytics services
 * Uses composition pattern - services can use these utilities without inheritance
 */

import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

/**
 * Date filter builder for Prisma queries
 */
export interface DateFilter {
  gte?: Date;
  lte?: Date;
}

/**
 * Time series data point
 */
export interface TimeSeriesPoint {
  date: string;
  [key: string]: string | number;
}

/**
 * Base Analytics Service Utilities
 * Provides common analytics helper functions
 */
export class BaseAnalyticsService {
  /**
   * Build date filter for Prisma where clauses
   */
  protected buildDateFilter(
    startDate?: Date,
    endDate?: Date
  ): DateFilter | undefined {
    if (!startDate && !endDate) {
      return undefined;
    }

    const filter: DateFilter = {};
    if (startDate) {
      filter.gte = startDate;
    }
    if (endDate) {
      filter.lte = endDate;
    }

    return filter;
  }

  /**
   * Build Prisma where clause with date filtering
   */
  protected buildDateWhereClause(
    startDate?: Date,
    endDate?: Date,
    dateField: string = "createdAt"
  ): Prisma.PrismaWhereInput {
    const dateFilter = this.buildDateFilter(startDate, endDate);
    if (!dateFilter) {
      return {};
    }

    return {
      [dateField]: dateFilter,
    };
  }

  /**
   * Calculate percentage safely (handles division by zero)
   */
  protected calculatePercentage(
    numerator: number,
    denominator: number,
    decimals: number = 2
  ): number {
    if (denominator === 0) {
      return 0;
    }
    return Number(((numerator / denominator) * 100).toFixed(decimals));
  }

  /**
   * Generate time series data for a date range
   */
  protected generateTimeSeries<T extends Record<string, any>>(
    startDate: Date,
    endDate: Date,
    data: T[],
    dateField: keyof T = "createdAt" as keyof T,
    period: "day" | "week" | "month" = "day",
    aggregator?: (group: T[]) => Record<string, number>
  ): TimeSeriesPoint[] {
    const timeSeries: TimeSeriesPoint[] = [];
    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Group data by period
    const periodMap = new Map<string, T[]>();

    for (const item of data) {
      const dateValue = item[dateField];
      if (!dateValue) continue;

      const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
      const periodKey = this.getPeriodKey(date, period);

      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, []);
      }
      periodMap.get(periodKey)!.push(item);
    }

    // Generate time series points
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const periodKey = this.getPeriodKey(date, period);

      const point: TimeSeriesPoint = {
        date: this.formatDateKey(date, period),
      };

      if (aggregator && periodMap.has(periodKey)) {
        const aggregated = aggregator(periodMap.get(periodKey)!);
        Object.assign(point, aggregated);
      } else {
        // Default: count items in period
        point.count = periodMap.get(periodKey)?.length || 0;
      }

      timeSeries.push(point);
    }

    return timeSeries;
  }

  /**
   * Get period key for grouping
   */
  private getPeriodKey(date: Date, period: "day" | "week" | "month"): string {
    switch (period) {
      case "day":
        return date.toISOString().split("T")[0]; // YYYY-MM-DD
      case "week":
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return weekStart.toISOString().split("T")[0];
      case "month":
        return date.toISOString().substring(0, 7); // YYYY-MM
      default:
        return date.toISOString().split("T")[0];
    }
  }

  /**
   * Format date key for time series
   */
  private formatDateKey(date: Date, period: "day" | "week" | "month"): string {
    switch (period) {
      case "day":
        return date.toISOString().split("T")[0];
      case "week":
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return weekStart.toISOString().split("T")[0];
      case "month":
        return date.toISOString().substring(0, 7);
      default:
        return date.toISOString().split("T")[0];
    }
  }

  /**
   * Aggregate data by period
   */
  protected aggregateByPeriod<T>(
    data: T[],
    dateField: keyof T,
    valueField: keyof T,
    period: "day" | "week" | "month" = "month"
  ): Array<{
    period: string;
    value: number;
    count: number;
  }> {
    const periodMap = new Map<
      string,
      { value: number; count: number }
    >();

    for (const item of data) {
      const dateValue = item[dateField];
      if (!dateValue) continue;

      const date = dateValue instanceof Date ? dateValue : new Date(dateValue as any);
      const periodKey = this.getPeriodKey(date, period);

      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, { value: 0, count: 0 });
      }

      const periodData = periodMap.get(periodKey)!;
      const value = Number(item[valueField]) || 0;
      periodData.value += value;
      periodData.count += 1;
    }

    return Array.from(periodMap.entries())
      .map(([period, data]) => ({
        period,
        value: data.value,
        count: data.count,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Calculate average safely
   */
  protected calculateAverage(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }
    const sum = values.reduce((acc, val) => acc + val, 0);
    return Number((sum / values.length).toFixed(2));
  }

  /**
   * Calculate sum of numeric values
   */
  protected calculateSum<T>(
    items: T[],
    valueField: keyof T,
    filter?: (item: T) => boolean
  ): number {
    const filtered = filter ? items.filter(filter) : items;
    return filtered.reduce((sum, item) => {
      const value = Number(item[valueField]) || 0;
      return sum + value;
    }, 0);
  }

  /**
   * Handle analytics errors consistently
   */
  protected handleAnalyticsError(
    error: unknown,
    context: string,
    operation: string
  ): never {
    logger.error(`Error in ${context}.${operation}`, { error });
    throw error instanceof Error
      ? error
      : new Error(`Failed to ${operation}: ${String(error)}`);
  }

  /**
   * Format currency amount
   */
  protected formatCurrency(amount: number, currency: string = "AUD"): string {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency,
    }).format(amount);
  }

  /**
   * Format number with locale
   */
  protected formatNumber(value: number, decimals: number = 0): string {
    return new Intl.NumberFormat("en-AU", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }
}
