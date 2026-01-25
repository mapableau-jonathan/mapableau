/**
 * Storage Tracker
 * Tracks file uploads and storage consumption for billing
 */

import { prisma } from "@/lib/prisma";
import { usageTracker, UsageType } from "./usage-tracker";
import { logger } from "@/lib/logger";

export interface StorageUsageData {
  userId: string;
  fileSize: number; // Bytes
  fileType?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
}

/**
 * Storage Tracker
 */
export class StorageTracker {
  /**
   * Track file upload
   */
  async trackFileUpload(data: StorageUsageData): Promise<void> {
    try {
      // Convert bytes to GB
      const sizeInGB = data.fileSize / (1024 * 1024 * 1024);

      if (sizeInGB <= 0) {
        return; // Skip tracking for empty or invalid files
      }

      await usageTracker.trackStorage(
        data.userId,
        sizeInGB,
        data.resourceId,
        {
          fileSize: data.fileSize,
          fileType: data.fileType,
          ...data.metadata,
        }
      );

      logger.debug("Storage usage tracked", {
        userId: data.userId,
        sizeInGB,
        fileType: data.fileType,
      });
    } catch (error) {
      logger.error("Error tracking storage usage", { error, data });
      throw error;
    }
  }

  /**
   * Track file deletion (negative usage)
   */
  async trackFileDeletion(
    userId: string,
    fileSize: number,
    resourceId?: string
  ): Promise<void> {
    try {
      const sizeInGB = fileSize / (1024 * 1024 * 1024);

      // Track as negative quantity to reduce storage usage
      await usageTracker.trackStorage(
        userId,
        -sizeInGB, // Negative to reduce
        resourceId,
        {
          action: "deletion",
          fileSize,
        }
      );
    } catch (error) {
      logger.error("Error tracking file deletion", { error, userId, fileSize });
      throw error;
    }
  }

  /**
   * Get storage usage summary for user
   */
  async getUserStorageSummary(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalStorageGB: number;
    totalFiles: number;
    totalCost: number;
    breakdownByType: Record<string, { count: number; sizeGB: number }>;
  }> {
    const where: any = {
      userId,
      usageType: UsageType.STORAGE_GB,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const records = await prisma.usageRecord.findMany({
      where,
      select: {
        quantity: true,
        cost: true,
        metadata: true,
      },
    });

    let totalStorageGB = 0;
    let totalCost = 0;
    const breakdownByType: Record<string, { count: number; sizeGB: number }> = {};

    for (const record of records) {
      const quantity = Number(record.quantity);
      totalStorageGB += quantity;
      totalCost += Number(record.cost);

      const metadata = record.metadata as any;
      const fileType = metadata?.fileType || "unknown";

      if (!breakdownByType[fileType]) {
        breakdownByType[fileType] = { count: 0, sizeGB: 0 };
      }

      breakdownByType[fileType].count += 1;
      breakdownByType[fileType].sizeGB += Math.abs(quantity); // Use absolute value
    }

    return {
      totalStorageGB,
      totalFiles: records.length,
      totalCost,
      breakdownByType,
    };
  }

  /**
   * Get current storage usage (not historical)
   */
  async getCurrentStorageUsage(userId: string): Promise<number> {
    const records = await prisma.usageRecord.findMany({
      where: {
        userId,
        usageType: UsageType.STORAGE_GB,
      },
      select: {
        quantity: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Sum all storage records (including negative for deletions)
    return records.reduce((sum, record) => sum + Number(record.quantity), 0);
  }

  /**
   * Check if user has exceeded storage limit
   */
  async checkStorageLimit(userId: string, limitGB?: number): Promise<{
    currentUsage: number;
    limit: number;
    exceeded: boolean;
    remaining: number;
  }> {
    const currentUsage = await this.getCurrentStorageUsage(userId);
    const limit = limit || parseFloat(process.env.STORAGE_LIMIT_GB || "100");

    return {
      currentUsage,
      limit,
      exceeded: currentUsage > limit,
      remaining: Math.max(0, limit - currentUsage),
    };
  }
}

// Export singleton instance
export const storageTracker = new StorageTracker();
