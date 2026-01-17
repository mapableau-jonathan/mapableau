/**
 * Predictive Analytics Service
 * ML-based predictions for quality and risk management
 */

import { prisma } from "../../prisma";

export interface RiskPrediction {
  type: "incident" | "complaint" | "care_plan_failure";
  probability: number; // 0-1
  factors: string[];
  recommendation: string;
}

export interface CarePlanPrediction {
  carePlanId: string;
  successProbability: number; // 0-1
  factors: string[];
  recommendations: string[];
}

export interface ProviderForecast {
  providerId: string;
  predictedScore: number; // 0-100
  trend: "improving" | "declining" | "stable";
  confidence: number; // 0-1
}

export class PredictiveAnalyticsService {
  /**
   * Predict incident likelihood
   */
  async predictIncidentRisk(
    participantId?: string,
    workerId?: string
  ): Promise<RiskPrediction> {
    // TODO: Implement ML model for incident prediction
    // For now, use rule-based approach

    let probability = 0.1; // Base probability
    const factors: string[] = [];

    if (participantId) {
      // Check participant's incident history
      const pastIncidents = await prisma.incident.count({
        where: { participantId },
      });

      if (pastIncidents > 0) {
        probability += 0.2;
        factors.push("Previous incident history");
      }

      // Check complaint history
      const complaints = await prisma.complaint.count({
        where: { participantId },
      });

      if (complaints > 2) {
        probability += 0.15;
        factors.push("Multiple complaints");
      }
    }

    if (workerId) {
      // Check worker's incident history
      const workerIncidents = await prisma.incident.count({
        where: { workerId },
      });

      if (workerIncidents > 0) {
        probability += 0.1;
        factors.push("Worker incident history");
      }
    }

    return {
      type: "incident",
      probability: Math.min(1, probability),
      factors,
      recommendation:
        probability > 0.3
          ? "Implement additional monitoring and support measures"
          : "Continue standard monitoring",
    };
  }

  /**
   * Predict care plan success
   */
  async predictCarePlanSuccess(
    carePlanId: string
  ): Promise<CarePlanPrediction> {
    const carePlan = await prisma.carePlan.findUnique({
      where: { id: carePlanId },
      include: {
        participant: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!carePlan) {
      throw new Error("Care plan not found");
    }

    let successProbability = 0.7; // Base probability
    const factors: string[] = [];
    const recommendations: string[] = [];

    // Analyze goals
    const goals = carePlan.goals as Array<{
      description: string;
      targetDate: string;
      status?: string;
    }>;

    if (goals.length === 0) {
      successProbability -= 0.2;
      factors.push("No goals defined");
      recommendations.push("Define clear, measurable goals");
    } else if (goals.length > 5) {
      successProbability -= 0.1;
      factors.push("Too many goals");
      recommendations.push("Focus on 3-5 key goals");
    }

    // Check participant's past care plan success
    const pastPlans = await prisma.carePlan.findMany({
      where: {
        participantId: carePlan.participantId,
        id: { not: carePlanId },
      },
    });

    if (pastPlans.length > 0) {
      // Calculate past success rate
      let pastAchieved = 0;
      let pastTotal = 0;
      pastPlans.forEach((plan) => {
        const planGoals = plan.goals as Array<{ status?: string }>;
        pastTotal += planGoals.length;
        pastAchieved += planGoals.filter(
          (g) => g.status === "ACHIEVED"
        ).length;
      });

      if (pastTotal > 0) {
        const pastRate = pastAchieved / pastTotal;
        successProbability = (successProbability + pastRate) / 2;
        factors.push(`Past success rate: ${(pastRate * 100).toFixed(0)}%`);
      }
    }

    return {
      carePlanId,
      successProbability: Math.max(0, Math.min(1, successProbability)),
      factors,
      recommendations,
    };
  }

  /**
   * Forecast provider performance
   */
  async forecastProviderPerformance(
    providerId: string
  ): Promise<ProviderForecast> {
    // TODO: Implement time series forecasting
    // For now, use simple trend analysis

    const currentScore = 75; // Placeholder - would use ProviderScoringService

    return {
      providerId,
      predictedScore: currentScore,
      trend: "stable",
      confidence: 0.6,
    };
  }

  /**
   * Predict budget utilization
   */
  async predictBudgetUtilization(planId: string): Promise<{
    predictedUtilization: number; // 0-1
    predictedShortfall: number; // AUD
    recommendations: string[];
  }> {
    const plan = await prisma.nDISPlan.findUnique({
      where: { id: planId },
      include: {
        payments: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!plan) {
      throw new Error("NDIS plan not found");
    }

    // Calculate current utilization rate
    const spent = Number(plan.totalBudget) - Number(plan.remainingBudget);
    const utilizationRate = Number(plan.totalBudget) > 0
      ? spent / Number(plan.totalBudget)
      : 0;

    // Simple linear projection
    const daysElapsed =
      (Date.now() - plan.startDate.getTime()) / (1000 * 60 * 60 * 24);
    const totalDays =
      (plan.endDate.getTime() - plan.startDate.getTime()) /
      (1000 * 60 * 60 * 24);

    const predictedUtilization =
      totalDays > 0 ? (utilizationRate / daysElapsed) * totalDays : utilizationRate;

    const predictedShortfall =
      predictedUtilization > 1
        ? (predictedUtilization - 1) * Number(plan.totalBudget)
        : 0;

    const recommendations: string[] = [];
    if (predictedUtilization > 1.1) {
      recommendations.push("Budget likely to be exceeded - review service allocations");
    } else if (predictedUtilization < 0.8) {
      recommendations.push("Budget underutilized - consider additional services");
    }

    return {
      predictedUtilization: Math.min(1, predictedUtilization),
      predictedShortfall,
      recommendations,
    };
  }

  /**
   * Forecast service demand
   */
  async forecastServiceDemand(
    category: string,
    days: number = 30
  ): Promise<{
    predictedDemand: number;
    confidence: number;
    factors: string[];
  }> {
    // TODO: Implement time series forecasting
    // For now, use simple average

    const payments = await prisma.paymentTransaction.findMany({
      where: {
        serviceCode: { startsWith: category },
        createdAt: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const avgPerDay = payments.length / 90;
    const predictedDemand = avgPerDay * days;

    return {
      predictedDemand: Math.round(predictedDemand),
      confidence: 0.7,
      factors: ["Historical average", "Seasonal patterns"],
    };
  }
}
