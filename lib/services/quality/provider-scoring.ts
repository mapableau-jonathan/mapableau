/**
 * Provider Quality Scoring Service
 * Calculates provider quality scores based on multiple factors
 */

import { prisma } from "../../prisma";

export interface ProviderScore {
  providerId: string;
  overallScore: number; // 0-100
  categoryScores: {
    serviceQuality: number;
    participantSatisfaction: number;
    compliance: number;
    timeliness: number;
    communication: number;
  };
  rating: "Excellent" | "Good" | "Satisfactory" | "Needs Improvement";
  trend: "improving" | "declining" | "stable";
}

export interface ProviderScoreBreakdown {
  providerId: string;
  scores: ProviderScore;
  breakdown: {
    factor: string;
    weight: number;
    score: number;
    contribution: number;
  }[];
}

export class ProviderScoringService {
  /**
   * Calculate provider quality score
   */
  async calculateProviderScore(providerId: string): Promise<ProviderScore> {
    // Get provider data
    const provider = await prisma.user.findUnique({
      where: { id: providerId },
      include: {
        providerRegistration: true,
        providerPayments: {
          take: 100, // Recent payments
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!provider || !provider.providerRegistration) {
      throw new Error("Provider not found");
    }

    // Calculate category scores
    const serviceQuality = await this.calculateServiceQualityScore(providerId);
    const participantSatisfaction =
      await this.calculateSatisfactionScore(providerId);
    const compliance = await this.calculateComplianceScore(providerId);
    const timeliness = await this.calculateTimelinessScore(providerId);
    const communication = await this.calculateCommunicationScore(providerId);

    // Weighted average
    const overallScore =
      serviceQuality * 0.3 +
      participantSatisfaction * 0.25 +
      compliance * 0.2 +
      timeliness * 0.15 +
      communication * 0.1;

    // Determine rating
    let rating: "Excellent" | "Good" | "Satisfactory" | "Needs Improvement";
    if (overallScore >= 90) {
      rating = "Excellent";
    } else if (overallScore >= 75) {
      rating = "Good";
    } else if (overallScore >= 60) {
      rating = "Satisfactory";
    } else {
      rating = "Needs Improvement";
    }

    return {
      providerId,
      overallScore: Math.round(overallScore),
      categoryScores: {
        serviceQuality: Math.round(serviceQuality),
        participantSatisfaction: Math.round(participantSatisfaction),
        compliance: Math.round(compliance),
        timeliness: Math.round(timeliness),
        communication: Math.round(communication),
      },
      rating,
      trend: "stable", // TODO: Calculate trend from historical data
    };
  }

  /**
   * Calculate service quality score
   */
  private async calculateServiceQualityScore(providerId: string): Promise<number> {
    // Base score
    let score = 70;

    // Check payment transaction success rate
    const payments = await prisma.paymentTransaction.findMany({
      where: { providerId },
    });

    if (payments.length > 0) {
      const successRate =
        (payments.filter((p) => p.status === "COMPLETED").length /
          payments.length) *
        100;
      score = (score + successRate) / 2;
    }

    return Math.min(100, score);
  }

  /**
   * Calculate participant satisfaction score
   */
  private async calculateSatisfactionScore(providerId: string): Promise<number> {
    // Get complaints with satisfaction ratings
    const complaints = await prisma.complaint.findMany({
      where: {
        worker: {
          user: {
            providerRegistration: {
              userId: providerId,
            },
          },
        },
        satisfactionRating: { not: null },
      },
      select: {
        satisfactionRating: true,
      },
    });

    if (complaints.length === 0) {
      return 75; // Neutral score if no data
    }

    const ratings = complaints
      .map((c) => c.satisfactionRating)
      .filter((r): r is number => r !== null);

    const avgRating =
      ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

    // Convert 1-5 rating to 0-100 score
    return (avgRating / 5) * 100;
  }

  /**
   * Calculate compliance score
   */
  private async calculateComplianceScore(providerId: string): Promise<number> {
    const provider = await prisma.providerRegistration.findFirst({
      where: { userId: providerId },
    });

    if (!provider) return 0;

    let score = 50; // Base score

    // Registration status
    if (provider.registrationStatus === "ACTIVE") {
      score += 30;
    }

    // Service categories registered
    if (provider.serviceCategories.length > 0) {
      score += 20;
    }

    return Math.min(100, score);
  }

  /**
   * Calculate timeliness score
   */
  private async calculateTimelinessScore(providerId: string): Promise<number> {
    // TODO: Calculate based on service delivery timeliness
    // For now, return neutral score
    return 75;
  }

  /**
   * Calculate communication score
   */
  private async calculateCommunicationScore(
    providerId: string
  ): Promise<number> {
    // TODO: Calculate based on response times, case note frequency, etc.
    // For now, return neutral score
    return 75;
  }

  /**
   * Get provider score breakdown
   */
  async getProviderScoreBreakdown(
    providerId: string
  ): Promise<ProviderScoreBreakdown> {
    const score = await this.calculateProviderScore(providerId);

    const breakdown = [
      {
        factor: "Service Quality",
        weight: 0.3,
        score: score.categoryScores.serviceQuality,
        contribution:
          score.categoryScores.serviceQuality * 0.3,
      },
      {
        factor: "Participant Satisfaction",
        weight: 0.25,
        score: score.categoryScores.participantSatisfaction,
        contribution:
          score.categoryScores.participantSatisfaction * 0.25,
      },
      {
        factor: "Compliance",
        weight: 0.2,
        score: score.categoryScores.compliance,
        contribution: score.categoryScores.compliance * 0.2,
      },
      {
        factor: "Timeliness",
        weight: 0.15,
        score: score.categoryScores.timeliness,
        contribution: score.categoryScores.timeliness * 0.15,
      },
      {
        factor: "Communication",
        weight: 0.1,
        score: score.categoryScores.communication,
        contribution: score.categoryScores.communication * 0.1,
      },
    ];

    return {
      providerId,
      scores: score,
      breakdown,
    };
  }

  /**
   * Compare provider with industry benchmarks
   */
  async compareWithBenchmarks(providerId: string): Promise<{
    providerScore: number;
    industryAverage: number;
    percentile: number;
  }> {
    const providerScore = await this.calculateProviderScore(providerId);

    // TODO: Calculate industry average from all providers
    const industryAverage = 75; // Placeholder

    // Calculate percentile (simplified)
    const percentile =
      providerScore.overallScore >= industryAverage
        ? 50 + ((providerScore.overallScore - industryAverage) / 25) * 50
        : (providerScore.overallScore / industryAverage) * 50;

    return {
      providerScore: providerScore.overallScore,
      industryAverage,
      percentile: Math.min(100, Math.max(0, Math.round(percentile))),
    };
  }
}
