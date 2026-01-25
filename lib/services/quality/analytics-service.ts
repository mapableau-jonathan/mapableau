/**
 * Quality Analytics Service
 * Core analytics logic for quality metrics and KPIs
 */

import { prisma } from "../../prisma";
import { BaseAnalyticsService } from "../analytics/base-analytics-service";

export interface QualityMetrics {
  serviceDeliveryKPIs: {
    totalServices: number;
    completedServices: number;
    completionRate: number;
    avgServiceTime: number;
  };
  participantSatisfaction: {
    avgRating: number;
    totalRatings: number;
    ratingDistribution: Record<number, number>;
  };
  providerPerformance: {
    totalProviders: number;
    activeProviders: number;
    avgProviderScore: number;
    topPerformers: Array<{ providerId: string; score: number }>;
  };
  incidentTrends: {
    totalIncidents: number;
    seriousIncidents: number;
    trend: "increasing" | "decreasing" | "stable";
    monthlyData: Array<{ month: string; count: number }>;
  };
  complaintTrends: {
    totalComplaints: number;
    resolvedComplaints: number;
    resolutionRate: number;
    avgResolutionTime: number; // days
  };
  carePlanMetrics: {
    totalCarePlans: number;
    activeCarePlans: number;
    avgGoalAchievementRate: number;
    plansDueForReview: number;
  };
  workerCompliance: {
    totalWorkers: number;
    verifiedWorkers: number;
    complianceRate: number;
    expiringVerifications: number;
  };
}

export class QualityAnalyticsService {
  private baseAnalytics: BaseAnalyticsService;

  constructor() {
    this.baseAnalytics = new BaseAnalyticsService();
  }

  /**
   * Get comprehensive quality metrics
   */
  async getQualityMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<QualityMetrics> {
    const dateFilter = this.baseAnalytics.buildDateFilter(startDate, endDate) || {};

    // Service Delivery KPIs
    const [totalPayments, completedPayments] = await Promise.all([
      prisma.paymentTransaction.count({
        where: {
          createdAt: dateFilter,
        },
      }),
      prisma.paymentTransaction.count({
        where: {
          createdAt: dateFilter,
          status: "COMPLETED",
        },
      }),
    ]);

    // Participant Satisfaction
    const complaints = await prisma.complaint.findMany({
      where: {
        createdAt: dateFilter,
        satisfactionRating: { not: null },
      },
      select: {
        satisfactionRating: true,
      },
    });

    const ratings = complaints
      .map((c) => c.satisfactionRating)
      .filter((r): r is number => r !== null);
    const avgRating = this.baseAnalytics.calculateAverage(ratings);

    // Provider Performance
    const providers = await prisma.providerRegistration.findMany({
      where: {
        registrationStatus: "ACTIVE",
      },
    });

    // Incident Trends
    const [totalIncidents, seriousIncidents] = await Promise.all([
      prisma.incident.count({
        where: {
          createdAt: dateFilter,
        },
      }),
      prisma.incident.count({
        where: {
          createdAt: dateFilter,
          incidentType: {
            in: ["SERIOUS_INCIDENT", "REPORTABLE_INCIDENT"],
          },
        },
      }),
    ]);

    // Complaint Trends
    const [totalComplaints, resolvedComplaints] = await Promise.all([
      prisma.complaint.count({
        where: {
          createdAt: dateFilter,
        },
      }),
      prisma.complaint.count({
        where: {
          createdAt: dateFilter,
          status: "RESOLVED",
        },
      }),
    ]);

    // Care Plan Metrics
    const [totalCarePlans, activeCarePlans] = await Promise.all([
      prisma.carePlan.count(),
      prisma.carePlan.count({
        where: {
          status: "Active",
        },
      }),
    ]);

    // Worker Compliance
    const [totalWorkers, verifiedWorkers] = await Promise.all([
      prisma.worker.count(),
      prisma.worker.count({
        where: {
          status: "VERIFIED",
        },
      }),
    ]);

    return {
      serviceDeliveryKPIs: {
        totalServices: totalPayments,
        completedServices: completedPayments,
        completionRate: this.baseAnalytics.calculatePercentage(
          completedPayments,
          totalPayments
        ),
        avgServiceTime: 0, // TODO: Calculate from service records
      },
      participantSatisfaction: {
        avgRating,
        totalRatings: ratings.length,
        ratingDistribution: this.calculateRatingDistribution(ratings),
      },
      providerPerformance: {
        totalProviders: providers.length,
        activeProviders: providers.length,
        avgProviderScore: 75, // TODO: Calculate from provider scoring
        topPerformers: [], // TODO: Calculate from provider scores
      },
      incidentTrends: {
        totalIncidents,
        seriousIncidents,
        trend: "stable", // TODO: Calculate trend from historical data
        monthlyData: [], // TODO: Calculate monthly breakdown
      },
      complaintTrends: {
        totalComplaints,
        resolvedComplaints,
        resolutionRate: this.baseAnalytics.calculatePercentage(
          resolvedComplaints,
          totalComplaints
        ),
        avgResolutionTime: 0, // TODO: Calculate from resolved complaints
      },
      carePlanMetrics: {
        totalCarePlans,
        activeCarePlans,
        avgGoalAchievementRate: 0, // TODO: Calculate from care plan goals
        plansDueForReview: 0, // TODO: Calculate from review dates
      },
      workerCompliance: {
        totalWorkers,
        verifiedWorkers,
        complianceRate: this.baseAnalytics.calculatePercentage(
          verifiedWorkers,
          totalWorkers
        ),
        expiringVerifications: 0, // TODO: Calculate from verification expiry dates
      },
    };
  }

  /**
   * Calculate rating distribution
   */
  private calculateRatingDistribution(
    ratings: number[]
  ): Record<number, number> {
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach((rating) => {
      if (rating >= 1 && rating <= 5) {
        distribution[rating] = (distribution[rating] || 0) + 1;
      }
    });
    return distribution;
  }

  /**
   * Get quality insights
   */
  async getQualityInsights(): Promise<{
    insights: Array<{
      type: "positive" | "warning" | "critical";
      title: string;
      description: string;
      recommendation?: string;
    }>;
  }> {
    const metrics = await this.getQualityMetrics();
    const insights: Array<{
      type: "positive" | "warning" | "critical";
      title: string;
      description: string;
      recommendation?: string;
    }> = [];

    // Analyze metrics and generate insights
    if (metrics.participantSatisfaction.avgRating >= 4.5) {
      insights.push({
        type: "positive",
        title: "High Participant Satisfaction",
        description: `Average satisfaction rating is ${metrics.participantSatisfaction.avgRating.toFixed(1)}/5`,
      });
    } else if (metrics.participantSatisfaction.avgRating < 3.5) {
      insights.push({
        type: "critical",
        title: "Low Participant Satisfaction",
        description: `Average satisfaction rating is ${metrics.participantSatisfaction.avgRating.toFixed(1)}/5`,
        recommendation: "Review service delivery processes and gather participant feedback",
      });
    }

    if (metrics.incidentTrends.seriousIncidents > 0) {
      insights.push({
        type: "warning",
        title: "Serious Incidents Detected",
        description: `${metrics.incidentTrends.seriousIncidents} serious incidents require attention`,
        recommendation: "Review incident management procedures and implement preventive measures",
      });
    }

    if (metrics.complaintTrends.resolutionRate < 80) {
      insights.push({
        type: "warning",
        title: "Complaint Resolution Rate Below Target",
        description: `Resolution rate is ${metrics.complaintTrends.resolutionRate.toFixed(1)}%`,
        recommendation: "Improve complaint resolution processes and reduce resolution time",
      });
    }

    return { insights };
  }
}
