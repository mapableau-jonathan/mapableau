/**
 * Risk Scoring Algorithm
 * Calculates risk scores based on various factors
 */

import type { RiskLevel } from "@prisma/client";

export interface RiskFactors {
  likelihood: number; // 1-5 scale
  impact: number; // 1-5 scale
  frequency?: number; // How often it could occur
  detectability?: number; // How easy it is to detect (1-5, lower = harder to detect)
  existingControls?: number; // Strength of existing controls (1-5, higher = stronger)
}

export interface RiskScore {
  score: number; // 0-100
  level: RiskLevel;
  factors: RiskFactors;
}

export class RiskScoringService {
  /**
   * Calculate risk score based on factors
   * Uses a modified risk matrix approach
   */
  calculateRiskScore(factors: RiskFactors): RiskScore {
    // Base score from likelihood and impact
    let baseScore = factors.likelihood * factors.impact * 4; // Max 100

    // Adjust for frequency (higher frequency = higher risk)
    if (factors.frequency) {
      baseScore *= 1 + (factors.frequency - 1) * 0.1; // Up to 40% increase
    }

    // Adjust for detectability (harder to detect = higher risk)
    if (factors.detectability) {
      const detectabilityMultiplier = (6 - factors.detectability) / 5; // Inverse: 1=low risk, 5=high risk
      baseScore *= 1 + detectabilityMultiplier * 0.2; // Up to 20% increase
    }

    // Adjust for existing controls (stronger controls = lower risk)
    if (factors.existingControls) {
      const controlReduction = (factors.existingControls - 1) / 4; // 0-1 scale
      baseScore *= 1 - controlReduction * 0.3; // Up to 30% reduction
    }

    // Ensure score is between 0 and 100
    const score = Math.min(100, Math.max(0, Math.round(baseScore)));

    // Determine risk level
    let level: RiskLevel;
    if (score >= 75) {
      level = "CRITICAL";
    } else if (score >= 50) {
      level = "HIGH";
    } else if (score >= 25) {
      level = "MEDIUM";
    } else {
      level = "LOW";
    }

    return {
      score,
      level,
      factors,
    };
  }

  /**
   * Calculate risk score from qualitative assessment
   */
  calculateFromQualitative(
    likelihood: "Rare" | "Unlikely" | "Possible" | "Likely" | "Almost Certain",
    impact: "Negligible" | "Minor" | "Moderate" | "Major" | "Catastrophic"
  ): RiskScore {
    const likelihoodMap: Record<string, number> = {
      Rare: 1,
      Unlikely: 2,
      Possible: 3,
      Likely: 4,
      "Almost Certain": 5,
    };

    const impactMap: Record<string, number> = {
      Negligible: 1,
      Minor: 2,
      Moderate: 3,
      Major: 4,
      Catastrophic: 5,
    };

    return this.calculateRiskScore({
      likelihood: likelihoodMap[likelihood],
      impact: impactMap[impact],
    });
  }

  /**
   * Get recommended mitigation priority based on risk score
   */
  getMitigationPriority(score: number): {
    priority: "Immediate" | "High" | "Medium" | "Low";
    timeframe: string;
  } {
    if (score >= 75) {
      return {
        priority: "Immediate",
        timeframe: "Within 24 hours",
      };
    } else if (score >= 50) {
      return {
        priority: "High",
        timeframe: "Within 1 week",
      };
    } else if (score >= 25) {
      return {
        priority: "Medium",
        timeframe: "Within 1 month",
      };
    } else {
      return {
        priority: "Low",
        timeframe: "Within 3 months",
      };
    }
  }

  /**
   * Recalculate risk score after mitigation
   */
  recalculateAfterMitigation(
    originalScore: RiskScore,
    mitigationEffectiveness: number // 0-1, where 1 = completely effective
  ): RiskScore {
    const newScore = originalScore.score * (1 - mitigationEffectiveness);
    const newLevel =
      newScore >= 75
        ? "CRITICAL"
        : newScore >= 50
        ? "HIGH"
        : newScore >= 25
        ? "MEDIUM"
        : "LOW";

    return {
      score: Math.round(newScore),
      level: newLevel as RiskLevel,
      factors: {
        ...originalScore.factors,
        existingControls: Math.min(
          5,
          (originalScore.factors.existingControls || 1) +
            mitigationEffectiveness * 4
        ),
      },
    };
  }
}
