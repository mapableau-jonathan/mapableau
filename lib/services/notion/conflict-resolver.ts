/**
 * Conflict Resolution Service
 * Handles conflicts in two-way sync between MapAble and Notion
 */

import { getNotionConfig, type ConflictResolutionStrategy } from "../../config/notion";
import { logger } from "../../logger";

export interface ConflictData {
  systemData: Record<string, any>;
  notionData: Record<string, any>;
  systemLastModified: Date;
  notionLastEdited: Date;
  entityType: string;
  systemId: string;
}

export interface ConflictResolution {
  resolved: boolean;
  data: Record<string, any>;
  strategy: ConflictResolutionStrategy;
  reason?: string;
}

/**
 * Conflict Resolution Service
 */
export class ConflictResolver {
  private config = getNotionConfig();

  /**
   * Detect if there's a conflict between system and Notion data
   */
  detectConflict(conflict: ConflictData): boolean {
    const { systemData, notionData, systemLastModified, notionLastEdited } = conflict;

    // If timestamps are the same (within 1 second), no conflict
    const timeDiff = Math.abs(systemLastModified.getTime() - notionLastEdited.getTime());
    if (timeDiff < 1000) {
      return false;
    }

    // Check if any fields differ
    const systemKeys = Object.keys(systemData);
    const notionKeys = Object.keys(notionData);

    // Compare common fields
    for (const key of systemKeys) {
      if (notionKeys.includes(key)) {
        const systemValue = systemData[key];
        const notionValue = notionData[key];

        // Deep comparison (simplified)
        if (JSON.stringify(systemValue) !== JSON.stringify(notionValue)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Resolve conflict using configured strategy
   */
  resolveConflict(conflict: ConflictData): ConflictResolution {
    const strategy = this.config.conflictStrategy;

    switch (strategy) {
      case "last-write-wins":
        return this.resolveLastWriteWins(conflict);
      case "timestamp-based":
        return this.resolveTimestampBased(conflict);
      case "manual-review":
        return this.resolveManualReview(conflict);
      default:
        return this.resolveLastWriteWins(conflict);
    }
  }

  /**
   * Last-write-wins strategy: Use the most recently modified data
   */
  private resolveLastWriteWins(conflict: ConflictData): ConflictResolution {
    const { systemData, notionData, systemLastModified, notionLastEdited } = conflict;

    const systemIsNewer = systemLastModified > notionLastEdited;
    const resolvedData = systemIsNewer ? systemData : notionData;

    return {
      resolved: true,
      data: resolvedData,
      strategy: "last-write-wins",
      reason: systemIsNewer
        ? "System data is newer"
        : "Notion data is newer",
    };
  }

  /**
   * Timestamp-based strategy: Merge fields based on individual timestamps
   * (More complex - would need field-level timestamps)
   */
  private resolveTimestampBased(conflict: ConflictData): ConflictResolution {
    // For now, fall back to last-write-wins
    // In a full implementation, this would merge at field level
    return this.resolveLastWriteWins(conflict);
  }

  /**
   * Manual review strategy: Mark conflict for manual resolution
   */
  private resolveManualReview(conflict: ConflictData): ConflictResolution {
    // Mark conflict in database for manual review
    // Return system data as default, but flag for review
    return {
      resolved: false,
      data: conflict.systemData,
      strategy: "manual-review",
      reason: "Conflict requires manual review",
    };
  }

  /**
   * Mark conflict as pending in database
   */
  async markConflictPending(
    entityType: string,
    systemId: string,
    conflict: ConflictData
  ): Promise<void> {
    const { prisma } = await import("@/lib/prisma");
    
    try {
      await prisma.notionSyncMapping.updateMany({
        where: {
          entityType,
          systemId,
        },
        data: {
          conflictState: "pending",
          lastModifiedAt: conflict.systemLastModified,
          notionLastEditedAt: conflict.notionLastEdited,
        },
      });

      logger.warn("Conflict marked for manual review", {
        entityType,
        systemId,
        strategy: this.config.conflictStrategy,
      });
    } catch (error) {
      logger.error("Error marking conflict as pending", { error, entityType, systemId });
    }
  }

  /**
   * Resolve conflict manually (called after human review)
   */
  async resolveManually(
    entityType: string,
    systemId: string,
    resolvedData: Record<string, any>,
    source: "system" | "notion"
  ): Promise<void> {
    const { prisma } = await import("@/lib/prisma");
    
    try {
      await prisma.notionSyncMapping.updateMany({
        where: {
          entityType,
          systemId,
        },
        data: {
          conflictState: "resolved",
          lastSyncedAt: new Date(),
        },
      });

      logger.info("Conflict resolved manually", {
        entityType,
        systemId,
        source,
      });
    } catch (error) {
      logger.error("Error resolving conflict manually", { error, entityType, systemId });
    }
  }

  /**
   * Get pending conflicts
   */
  async getPendingConflicts(): Promise<Array<{
    entityType: string;
    systemId: string;
    lastModifiedAt: Date | null;
    notionLastEditedAt: Date | null;
  }>> {
    const { prisma } = await import("@/lib/prisma");
    
    try {
      const conflicts = await prisma.notionSyncMapping.findMany({
        where: {
          conflictState: "pending",
        },
        select: {
          entityType: true,
          systemId: true,
          lastModifiedAt: true,
          notionLastEditedAt: true,
        },
      });

      return conflicts;
    } catch (error) {
      logger.error("Error fetching pending conflicts", { error });
      return [];
    }
  }
}
