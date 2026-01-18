import { prisma } from "../../prisma";

export interface CreateCarePlanData {
  participantId: string;
  workerId?: string;
  planName: string;
  goals: Array<{
    description: string;
    targetDate: Date;
    status?: "ACTIVE" | "ACHIEVED" | "ON_HOLD";
  }>;
  services?: Record<string, unknown>;
  startDate: Date;
  reviewDate: Date;
}

export interface UpdateCarePlanData {
  planName?: string;
  goals?: Array<{
    description: string;
    targetDate: Date;
    status?: "ACTIVE" | "ACHIEVED" | "ON_HOLD";
  }>;
  services?: Record<string, unknown>;
  reviewDate?: Date;
  status?: string;
}

export interface UpdateGoalData {
  goalIndex: number;
  description?: string;
  targetDate?: Date;
  status?: "ACTIVE" | "ACHIEVED" | "ON_HOLD";
  progress?: number; // 0-100
}

export class CarePlanService {
  /**
   * Create a new care plan
   */
  async createCarePlan(data: CreateCarePlanData) {
    const carePlan = await prisma.carePlan.create({
      data: {
        participantId: data.participantId,
        workerId: data.workerId,
        planName: data.planName,
        goals: data.goals as any,
        services: data.services || {},
        startDate: data.startDate,
        reviewDate: data.reviewDate,
        status: "Active",
      },
      include: {
        participant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        worker: {
          include: {
            user: {
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

    return carePlan;
  }

  /**
   * Get care plan by ID
   */
  async getCarePlan(planId: string) {
    const carePlan = await prisma.carePlan.findUnique({
      where: { id: planId },
      include: {
        participant: {
          select: {
            id: true,
            name: true,
            email: true,
            ndisPlan: {
              select: {
                id: true,
                planNumber: true,
                status: true,
                totalBudget: true,
                remainingBudget: true,
              },
            },
          },
        },
        worker: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        notes: {
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        },
      },
    });

    return carePlan;
  }

  /**
   * Get all care plans for a participant
   */
  async getParticipantCarePlans(participantId: string) {
    const carePlans = await prisma.carePlan.findMany({
      where: { participantId },
      include: {
        worker: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            notes: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return carePlans;
  }

  /**
   * Update care plan
   */
  async updateCarePlan(planId: string, data: UpdateCarePlanData) {
    const carePlan = await prisma.carePlan.update({
      where: { id: planId },
      data: {
        planName: data.planName,
        goals: data.goals as any,
        services: data.services as any,
        reviewDate: data.reviewDate,
        status: data.status,
      },
    });

    // Trigger Notion sync
    try {
      const { onCarePlanUpdated } = await import("../notion/event-listeners");
      await onCarePlanUpdated(carePlan.id);
    } catch (error) {
      // Don't fail if Notion sync fails
      console.warn("Failed to trigger Notion sync for care plan update", error);
    }

    return carePlan;
  }

  /**
   * Update a specific goal in a care plan
   */
  async updateGoal(planId: string, goalData: UpdateGoalData) {
    const carePlan = await prisma.carePlan.findUnique({
      where: { id: planId },
      select: { goals: true },
    });

    if (!carePlan) {
      throw new Error("Care plan not found");
    }

    const goals = carePlan.goals as Array<{
      description: string;
      targetDate: string;
      status?: string;
      progress?: number;
    }>;

    if (goalData.goalIndex >= goals.length) {
      throw new Error("Goal index out of range");
    }

    // Update the goal
    goals[goalData.goalIndex] = {
      ...goals[goalData.goalIndex],
      ...(goalData.description && { description: goalData.description }),
      ...(goalData.targetDate && {
        targetDate: goalData.targetDate.toISOString(),
      }),
      ...(goalData.status && { status: goalData.status }),
      ...(goalData.progress !== undefined && { progress: goalData.progress }),
    };

    // Update the care plan
    const updated = await prisma.carePlan.update({
      where: { id: planId },
      data: {
        goals: goals as any,
      },
    });

    return updated;
  }

  /**
   * Get goal achievement statistics
   */
  async getGoalStatistics(planId: string) {
    const carePlan = await prisma.carePlan.findUnique({
      where: { id: planId },
      select: { goals: true },
    });

    if (!carePlan) {
      return null;
    }

    const goals = carePlan.goals as Array<{
      status?: string;
      progress?: number;
    }>;

    const total = goals.length;
    const achieved = goals.filter((g) => g.status === "ACHIEVED").length;
    const active = goals.filter((g) => g.status === "ACTIVE").length;
    const onHold = goals.filter((g) => g.status === "ON_HOLD").length;
    const avgProgress =
      goals.reduce((sum, g) => sum + (g.progress || 0), 0) / total || 0;

    return {
      total,
      achieved,
      active,
      onHold,
      achievementRate: total > 0 ? (achieved / total) * 100 : 0,
      avgProgress,
    };
  }
}
