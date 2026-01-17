/**
 * Metric Calculator Service
 * Calculates various quality metrics and KPIs
 */

import { prisma } from "../../prisma";

export interface MetricCalculation {
  metric: string;
  value: number;
  unit: string;
  trend?: "up" | "down" | "stable";
  target?: number;
  status?: "on_target" | "below_target" | "above_target";
}

export class MetricCalculatorService {
  /**
   * Calculate service delivery KPIs
   */
  async calculateServiceDeliveryKPIs(
    startDate: Date,
    endDate: Date
  ): Promise<MetricCalculation[]> {
    const payments = await prisma.paymentTransaction.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const total = payments.length;
    const completed = payments.filter((p) => p.status === "COMPLETED").length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return [
      {
        metric: "Service Completion Rate",
        value: completionRate,
        unit: "%",
        target: 95,
        status:
          completionRate >= 95
            ? "on_target"
            : completionRate >= 80
            ? "below_target"
            : "below_target",
      },
      {
        metric: "Total Services Delivered",
        value: completed,
        unit: "services",
      },
    ];
  }

  /**
   * Calculate participant satisfaction metrics
   */
  async calculateSatisfactionMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<MetricCalculation[]> {
    const complaints = await prisma.complaint.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        satisfactionRating: { not: null },
      },
      select: {
        satisfactionRating: true,
      },
    });

    const ratings = complaints
      .map((c) => c.satisfactionRating)
      .filter((r): r is number => r !== null);

    const avgRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : 0;

    return [
      {
        metric: "Average Satisfaction Rating",
        value: avgRating,
        unit: "/5",
        target: 4.5,
        status:
          avgRating >= 4.5
            ? "on_target"
            : avgRating >= 3.5
            ? "below_target"
            : "below_target",
      },
      {
        metric: "Total Ratings",
        value: ratings.length,
        unit: "ratings",
      },
    ];
  }

  /**
   * Calculate provider performance scores
   */
  async calculateProviderScores(): Promise<MetricCalculation[]> {
    const providers = await prisma.providerRegistration.findMany({
      where: {
        registrationStatus: "ACTIVE",
      },
    });

    // TODO: Calculate actual provider scores from service quality metrics
    const avgScore = 75; // Placeholder

    return [
      {
        metric: "Average Provider Score",
        value: avgScore,
        unit: "/100",
        target: 80,
        status:
          avgScore >= 80 ? "on_target" : "below_target",
      },
      {
        metric: "Active Providers",
        value: providers.length,
        unit: "providers",
      },
    ];
  }

  /**
   * Calculate care plan goal achievement rate
   */
  async calculateGoalAchievementRate(): Promise<MetricCalculation> {
    const carePlans = await prisma.carePlan.findMany({
      select: {
        goals: true,
      },
    });

    let totalGoals = 0;
    let achievedGoals = 0;

    carePlans.forEach((plan) => {
      const goals = plan.goals as Array<{ status?: string }>;
      totalGoals += goals.length;
      achievedGoals += goals.filter((g) => g.status === "ACHIEVED").length;
    });

    const achievementRate =
      totalGoals > 0 ? (achievedGoals / totalGoals) * 100 : 0;

    return {
      metric: "Care Plan Goal Achievement Rate",
      value: achievementRate,
      unit: "%",
      target: 80,
      status:
        achievementRate >= 80 ? "on_target" : "below_target",
    };
  }
}
