/**
 * Usage Tracker Service
 * Tracks API calls, service hours, and storage usage for billing
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export enum UsageType {
  API_CALL = "API_CALL",
  SERVICE_HOUR = "SERVICE_HOUR",
  STORAGE_GB = "STORAGE_GB",
}

export interface UsageRecordData {
  userId: string;
  usageType: UsageType;
  resourceId?: string;
  quantity: number;
  duration?: number; // Milliseconds for API calls
  metadata?: Record<string, any>;
}

export interface UsageCost {
  cost: number;
  rate: number;
  unit: string;
}

/**
 * Usage Tracker Service
 */
export class UsageTracker {
  private batchQueue: UsageRecordData[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 100;
  private readonly BATCH_TIMEOUT_MS = 5000; // 5 seconds

  /**
   * Track usage event
   * Batches writes for performance
   */
  async trackUsage(data: UsageRecordData): Promise<void> {
    // Calculate cost based on usage type
    const cost = await this.calculateCost(data);

    // Add to batch queue
    this.batchQueue.push({
      ...data,
      metadata: {
        ...data.metadata,
        calculatedAt: new Date().toISOString(),
        cost,
      },
    });

    // Flush batch if it reaches size limit
    if (this.batchQueue.length >= this.BATCH_SIZE) {
      await this.flushBatch();
    } else {
      // Set timeout to flush after delay
      if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => {
          this.flushBatch();
        }, this.BATCH_TIMEOUT_MS);
      }
    }
  }

  /**
   * Flush batched usage records to database
   */
  private async flushBatch(): Promise<void> {
    if (this.batchQueue.length === 0) {
      return;
    }

    const records = [...this.batchQueue];
    this.batchQueue = [];

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    try {
      // Create usage records in batch
      await prisma.$transaction(
        records.map((record) =>
          prisma.usageRecord.create({
            data: {
              userId: record.userId,
              usageType: record.usageType,
              resourceId: record.resourceId,
              quantity: record.quantity,
              duration: record.duration,
              cost: record.metadata?.cost || 0,
              metadata: record.metadata,
            },
          })
        )
      );

      logger.debug(`Flushed ${records.length} usage records to database`);
    } catch (error) {
      logger.error("Error flushing usage records batch", { error, count: records.length });
      // Re-queue records for retry (simplified - in production, use a proper queue)
      this.batchQueue.push(...records);
    }
  }

  /**
   * Calculate cost for usage record
   */
  private async calculateCost(data: UsageRecordData): Promise<number> {
    const rates = await this.getUsageRates();

    switch (data.usageType) {
      case UsageType.API_CALL:
        return rates.apiCallRate * data.quantity;

      case UsageType.SERVICE_HOUR:
        // Get service-specific rate from metadata if available
        const serviceType = data.metadata?.serviceType || "default";
        const hourlyRate = rates.serviceRates[serviceType] || rates.defaultServiceRate;
        return hourlyRate * data.quantity;

      case UsageType.STORAGE_GB:
        return rates.storageRatePerGB * data.quantity;

      default:
        return 0;
    }
  }

  /**
   * Get usage rates from environment/config
   */
  private async getUsageRates(): Promise<{
    apiCallRate: number;
    defaultServiceRate: number;
    serviceRates: Record<string, number>;
    storageRatePerGB: number;
  }> {
    return {
      apiCallRate: parseFloat(process.env.API_CALL_COST || "0.001"),
      defaultServiceRate: parseFloat(process.env.HOURLY_RATE_SERVICE_CARE || "50.00"),
      serviceRates: {
        care: parseFloat(process.env.HOURLY_RATE_SERVICE_CARE || "50.00"),
        transport: parseFloat(process.env.HOURLY_RATE_SERVICE_TRANSPORT || "30.00"),
        default: parseFloat(process.env.HOURLY_RATE_SERVICE_CARE || "50.00"),
      },
      storageRatePerGB: parseFloat(process.env.STORAGE_COST_PER_GB || "0.10"),
    };
  }

  /**
   * Track API call
   */
  async trackApiCall(
    userId: string,
    endpoint: string,
    method: string,
    duration: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.trackUsage({
      userId,
      usageType: UsageType.API_CALL,
      resourceId: `${method}:${endpoint}`,
      quantity: 1,
      duration,
      metadata: {
        endpoint,
        method,
        ...metadata,
      },
    });
  }

  /**
   * Track service hours
   */
  async trackServiceHours(
    userId: string,
    hours: number,
    serviceType: string,
    resourceId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.trackUsage({
      userId,
      usageType: UsageType.SERVICE_HOUR,
      resourceId,
      quantity: hours,
      metadata: {
        serviceType,
        ...metadata,
      },
    });
  }

  /**
   * Track storage usage
   */
  async trackStorage(
    userId: string,
    sizeInGB: number,
    resourceId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.trackUsage({
      userId,
      usageType: UsageType.STORAGE_GB,
      resourceId,
      quantity: sizeInGB,
      metadata: {
        ...metadata,
      },
    });
  }

  /**
   * Get usage summary for user
   */
  async getUserUsageSummary(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalApiCalls: number;
    totalServiceHours: number;
    totalStorageGB: number;
    totalCost: number;
  }> {
    const where: any = { userId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const records = await prisma.usageRecord.findMany({
      where,
      select: {
        usageType: true,
        quantity: true,
        cost: true,
      },
    });

    const summary = {
      totalApiCalls: 0,
      totalServiceHours: 0,
      totalStorageGB: 0,
      totalCost: 0,
    };

    for (const record of records) {
      summary.totalCost += Number(record.cost);

      switch (record.usageType) {
        case UsageType.API_CALL:
          summary.totalApiCalls += Number(record.quantity);
          break;
        case UsageType.SERVICE_HOUR:
          summary.totalServiceHours += Number(record.quantity);
          break;
        case UsageType.STORAGE_GB:
          summary.totalStorageGB += Number(record.quantity);
          break;
      }
    }

    return summary;
  }

  /**
   * Force flush any pending records
   */
  async flush(): Promise<void> {
    await this.flushBatch();
  }
}

// Export singleton instance
export const usageTracker = new UsageTracker();
