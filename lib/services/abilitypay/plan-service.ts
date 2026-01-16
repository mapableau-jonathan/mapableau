/**
 * Plan Service
 * Manages NDIS plan creation, budget allocation, and validation
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export interface CreatePlanData {
  participantId: string;
  planNumber: string;
  startDate: Date;
  endDate: Date;
  totalBudget: number;
  planManagerId?: string;
  metadata?: Record<string, any>;
  categories?: Array<{
    categoryCode: string;
    allocatedAmount: number;
    rules?: Record<string, any>;
  }>;
}

export interface UpdateBudgetData {
  categoryId?: string;
  categoryCode?: string;
  amount: number;
}

export class PlanService {
  /**
   * Create a new NDIS plan from NDIS Portal data
   */
  async createPlan(data: CreatePlanData) {
    const { categories = [], ...planData } = data;

    // Validate dates
    if (data.startDate >= data.endDate) {
      throw new Error("Start date must be before end date");
    }

    // Validate budget
    if (data.totalBudget <= 0) {
      throw new Error("Total budget must be greater than zero");
    }

    // Calculate total allocated amount from categories
    const totalAllocated = categories.reduce(
      (sum, cat) => sum + cat.allocatedAmount,
      0
    );

    if (totalAllocated > data.totalBudget) {
      throw new Error(
        "Total allocated amount exceeds total budget"
      );
    }

    // Create plan with categories in a transaction
    const plan = await prisma.$transaction(async (tx) => {
      const newPlan = await tx.nDISPlan.create({
        data: {
          participantId: planData.participantId,
          planNumber: planData.planNumber,
          status: "ACTIVE",
          startDate: planData.startDate,
          endDate: planData.endDate,
          totalBudget: planData.totalBudget,
          remainingBudget: planData.totalBudget,
          planManagerId: planData.planManagerId,
          metadata: planData.metadata || {},
          categories: {
            create: categories.map((cat) => ({
              categoryCode: cat.categoryCode,
              allocatedAmount: cat.allocatedAmount,
              remainingAmount: cat.allocatedAmount,
              spentAmount: 0,
              rules: cat.rules || {},
            })),
          },
        },
        include: {
          categories: true,
          participant: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          planManager: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return newPlan;
    });

    return plan;
  }

  /**
   * Get plan details with budget breakdown
   */
  async getPlan(planId: string) {
    const plan = await prisma.nDISPlan.findUnique({
      where: { id: planId },
      include: {
        categories: {
          orderBy: {
            categoryCode: "asc",
          },
        },
        participant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        planManager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        tokens: {
          where: {
            status: {
              in: ["MINTED", "ACTIVE"],
            },
          },
        },
        payments: {
          take: 10,
          orderBy: {
            createdAt: "desc",
          },
          include: {
            provider: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    return plan;
  }

  /**
   * Get plan by participant ID
   */
  async getPlanByParticipant(participantId: string) {
    const plan = await prisma.nDISPlan.findUnique({
      where: { participantId },
      include: {
        categories: {
          orderBy: {
            categoryCode: "asc",
          },
        },
      },
    });

    return plan;
  }

  /**
   * Update budget allocation for a category
   */
  async updateBudget(
    planId: string,
    updateData: UpdateBudgetData
  ) {
    const plan = await this.getPlan(planId);

    if (plan.status !== "ACTIVE") {
      throw new Error("Cannot update budget for inactive plan");
    }

    // Find the category
    let category;
    if (updateData.categoryId) {
      category = await prisma.budgetCategory.findUnique({
        where: { id: updateData.categoryId },
      });
    } else if (updateData.categoryCode) {
      category = await prisma.budgetCategory.findFirst({
        where: {
          planId,
          categoryCode: updateData.categoryCode,
        },
      });
    } else {
      throw new Error("Either categoryId or categoryCode must be provided");
    }

    if (!category) {
      throw new Error("Category not found");
    }

    // Calculate new remaining amount
    const newAllocated = updateData.amount;
    const newRemaining = newAllocated - category.spentAmount;

    if (newRemaining < 0) {
      throw new Error(
        "Cannot reduce allocation below already spent amount"
      );
    }

    // Update category and plan in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update category
      const updatedCategory = await tx.budgetCategory.update({
        where: { id: category!.id },
        data: {
          allocatedAmount: newAllocated,
          remainingAmount: newRemaining,
        },
      });

      // Recalculate plan remaining budget
      const allCategories = await tx.budgetCategory.findMany({
        where: { planId },
      });

      const totalAllocated = allCategories.reduce(
        (sum, cat) => sum + Number(cat.allocatedAmount),
        0
      );
      const totalSpent = allCategories.reduce(
        (sum, cat) => sum + Number(cat.spentAmount),
        0
      );
      const totalRemaining = totalAllocated - totalSpent;

      // Update plan
      await tx.nDISPlan.update({
        where: { id: planId },
        data: {
          totalBudget: totalAllocated,
          remainingBudget: totalRemaining,
        },
      });

      return updatedCategory;
    });

    return result;
  }

  /**
   * Validate that a plan is active and valid
   */
  async validatePlanActive(planId: string): Promise<boolean> {
    const plan = await prisma.nDISPlan.findUnique({
      where: { id: planId },
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true,
        remainingBudget: true,
      },
    });

    if (!plan) {
      return false;
    }

    const now = new Date();

    // Check status
    if (plan.status !== "ACTIVE") {
      return false;
    }

    // Check dates
    if (now < plan.startDate || now > plan.endDate) {
      return false;
    }

    // Check budget
    if (Number(plan.remainingBudget) <= 0) {
      return false;
    }

    return true;
  }

  /**
   * Get all categories for a plan
   */
  async getPlanCategories(planId: string) {
    const categories = await prisma.budgetCategory.findMany({
      where: { planId },
      orderBy: {
        categoryCode: "asc",
      },
    });

    return categories;
  }

  /**
   * Update plan status
   */
  async updatePlanStatus(
    planId: string,
    status: "ACTIVE" | "SUSPENDED" | "EXPIRED" | "CANCELLED"
  ) {
    const plan = await prisma.nDISPlan.update({
      where: { id: planId },
      data: { status },
    });

    return plan;
  }
}
