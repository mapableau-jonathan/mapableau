/**
 * NDIS Plan Synchronization Service
 * Synchronizes NDIS plans from NDIA portal to local database
 */

import { NDIAApiClient, type NDIAPlan } from "./api-client";
import { prisma } from "../../prisma";
import { logger } from "@/lib/logger";

export class PlanSyncService {
  private ndiaClient: NDIAApiClient;

  constructor() {
    this.ndiaClient = new NDIAApiClient();
  }

  /**
   * Sync NDIS plan for a participant
   */
  async syncPlan(participantId: string): Promise<{
    success: boolean;
    plan?: any;
    error?: string;
  }> {
    try {
      // Get plan from NDIA API
      const ndiaPlan = await this.ndiaClient.getPlan(participantId);

      if (!ndiaPlan) {
        return {
          success: false,
          error: "Plan not found in NDIA system",
        };
      }

      // Check if plan already exists
      const existingPlan = await prisma.nDISPlan.findUnique({
        where: { participantId },
      });

      // Map NDIA plan to our schema
      const planData = {
        planNumber: ndiaPlan.planNumber,
        status: this.mapStatus(ndiaPlan.status),
        startDate: new Date(ndiaPlan.startDate),
        endDate: new Date(ndiaPlan.endDate),
        totalBudget: ndiaPlan.totalBudget,
        remainingBudget: ndiaPlan.remainingBudget,
        metadata: {
          ndiaStatus: ndiaPlan.status,
          syncedAt: new Date().toISOString(),
        },
      };

      let plan;
      if (existingPlan) {
        // Update existing plan
        plan = await prisma.nDISPlan.update({
          where: { id: existingPlan.id },
          data: planData,
        });

        // Update budget categories
        await this.syncBudgetCategories(plan.id, ndiaPlan.categories);
      } else {
        // Create new plan
        plan = await prisma.nDISPlan.create({
          data: {
            ...planData,
            participantId,
          },
        });

        // Create budget categories
        await this.syncBudgetCategories(plan.id, ndiaPlan.categories);
      }

      logger.info("NDIS plan synchronized", {
        participantId,
        planNumber: ndiaPlan.planNumber,
      });

      return {
        success: true,
        plan,
      };
    } catch (error) {
      logger.error("Error syncing NDIS plan", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Sync budget categories
   */
  private async syncBudgetCategories(
    planId: string,
    categories: NDIAPlan["categories"]
  ) {
    // Delete existing categories
    await prisma.budgetCategory.deleteMany({
      where: { planId },
    });

    // Create new categories
    for (const category of categories) {
      await prisma.budgetCategory.create({
        data: {
          planId,
          categoryCode: category.code,
          allocatedAmount: category.allocatedAmount,
          spentAmount: category.spentAmount,
          remainingAmount: category.remainingAmount,
        },
      });
    }
  }

  /**
   * Map NDIA status to our status enum
   */
  private mapStatus(ndiaStatus: string): "DRAFT" | "ACTIVE" | "SUSPENDED" | "EXPIRED" | "CANCELLED" {
    const statusMap: Record<string, "DRAFT" | "ACTIVE" | "SUSPENDED" | "EXPIRED" | "CANCELLED"> = {
      ACTIVE: "ACTIVE",
      ACTIVE_PENDING_REVIEW: "ACTIVE",
      SUSPENDED: "SUSPENDED",
      EXPIRED: "EXPIRED",
      CANCELLED: "CANCELLED",
      DRAFT: "DRAFT",
    };

    return statusMap[ndiaStatus] || "DRAFT";
  }

  /**
   * Sync all plans for participants (batch operation)
   */
  async syncAllPlans(): Promise<{
    total: number;
    successful: number;
    failed: number;
    errors: Array<{ participantId: string; error: string }>;
  }> {
    const participants = await prisma.user.findMany({
      where: {
        role: "PARTICIPANT",
        ndisPlanId: { not: null },
      },
      select: { id: true },
    });

    const results = {
      total: participants.length,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ participantId: string; error: string }>,
    };

    for (const participant of participants) {
      const result = await this.syncPlan(participant.id);
      if (result.success) {
        results.successful++;
      } else {
        results.failed++;
        results.errors.push({
          participantId: participant.id,
          error: result.error || "Unknown error",
        });
      }
    }

    logger.info("Batch plan sync completed", results);

    return results;
  }
}
