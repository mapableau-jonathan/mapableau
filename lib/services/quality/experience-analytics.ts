/**
 * Participant Experience Analytics Service
 * Tracks and analyzes participant experience metrics
 */

import { prisma } from "../../prisma";

export interface ParticipantExperience {
  participantId: string;
  carePlanAchievement: {
    totalGoals: number;
    achievedGoals: number;
    achievementRate: number;
  };
  serviceUtilization: {
    totalServices: number;
    servicesByCategory: Record<string, number>;
    avgServicesPerMonth: number;
  };
  satisfactionTrend: Array<{
    date: string;
    rating: number;
  }>;
  workerMatchQuality: {
    avgMatchScore: number;
    totalMatches: number;
  };
  outcomes: {
    goalsAchieved: number;
    goalsInProgress: number;
    goalsOnHold: number;
  };
}

export class ExperienceAnalyticsService {
  /**
   * Get participant experience metrics
   */
  async getParticipantExperience(
    participantId: string
  ): Promise<ParticipantExperience> {
    // Get care plans
    const carePlans = await prisma.carePlan.findMany({
      where: { participantId },
      select: {
        goals: true,
      },
    });

    // Calculate goal achievement
    let totalGoals = 0;
    let achievedGoals = 0;
    let inProgress = 0;
    let onHold = 0;

    carePlans.forEach((plan) => {
      const goals = plan.goals as Array<{ status?: string }>;
      totalGoals += goals.length;
      goals.forEach((goal) => {
        if (goal.status === "ACHIEVED") achievedGoals++;
        else if (goal.status === "ACTIVE") inProgress++;
        else if (goal.status === "ON_HOLD") onHold++;
      });
    });

    // Get service utilization
    const payments = await prisma.paymentTransaction.findMany({
      where: { participantId },
      select: {
        serviceCode: true,
        createdAt: true,
      },
    });

    const servicesByCategory: Record<string, number> = {};
    payments.forEach((payment) => {
      const category = payment.serviceCode.split("_")[0] || "Other";
      servicesByCategory[category] = (servicesByCategory[category] || 0) + 1;
    });

    // Calculate average services per month
    if (payments.length > 0) {
      const firstPayment = payments[payments.length - 1];
      const monthsDiff =
        (Date.now() - firstPayment.createdAt.getTime()) /
        (1000 * 60 * 60 * 24 * 30);
      const avgServicesPerMonth =
        monthsDiff > 0 ? payments.length / monthsDiff : payments.length;
    }

    // Get satisfaction trend from complaints
    const complaints = await prisma.complaint.findMany({
      where: {
        participantId,
        satisfactionRating: { not: null },
      },
      select: {
        satisfactionRating: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const satisfactionTrend = complaints
      .filter((c) => c.satisfactionRating !== null)
      .map((c) => ({
        date: c.createdAt.toISOString().split("T")[0],
        rating: c.satisfactionRating!,
      }));

    return {
      participantId,
      carePlanAchievement: {
        totalGoals,
        achievedGoals,
        achievementRate:
          totalGoals > 0 ? (achievedGoals / totalGoals) * 100 : 0,
      },
      serviceUtilization: {
        totalServices: payments.length,
        servicesByCategory,
        avgServicesPerMonth: 0, // TODO: Calculate properly
      },
      satisfactionTrend,
      workerMatchQuality: {
        avgMatchScore: 0, // TODO: Calculate from worker assignments
        totalMatches: 0,
      },
      outcomes: {
        goalsAchieved: achievedGoals,
        goalsInProgress: inProgress,
        goalsOnHold: onHold,
      },
    };
  }

  /**
   * Get outcome measurements
   */
  async getOutcomeMeasurements(participantId: string) {
    const experience = await this.getParticipantExperience(participantId);

    return {
      goalAchievementRate: experience.carePlanAchievement.achievementRate,
      serviceUtilization: experience.serviceUtilization.totalServices,
      satisfactionScore:
        experience.satisfactionTrend.length > 0
          ? experience.satisfactionTrend.reduce(
              (sum, t) => sum + t.rating,
              0
            ) / experience.satisfactionTrend.length
          : 0,
      outcomes: experience.outcomes,
    };
  }
}
