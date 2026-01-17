/**
 * Compliance Report Generator
 * Generates NDIS compliance reports
 */

import { prisma } from "../../prisma";

export interface ComplianceReport {
  reportId: string;
  generatedAt: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  sections: {
    incidents: any;
    complaints: any;
    training: any;
    workerVerification: any;
    policies: any;
    risks: any;
  };
}

export class ComplianceReportGenerator {
  /**
   * Generate comprehensive compliance report
   */
  async generateComplianceReport(
    startDate: Date,
    endDate: Date
  ): Promise<ComplianceReport> {
    // Get all compliance data
    const [incidents, complaints, trainingRecords, workers, policies, risks] =
      await Promise.all([
        prisma.incident.findMany({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
        prisma.complaint.findMany({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
        prisma.trainingRecord.findMany({
          where: {
            completedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
        prisma.worker.findMany({
          include: {
            verifications: true,
          },
        }),
        prisma.policy.findMany({
          where: {
            effectiveDate: {
              lte: endDate,
            },
          },
        }),
        prisma.risk.findMany({
          where: {
            identifiedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
      ]);

    return {
      reportId: `COMP-${Date.now()}`,
      generatedAt: new Date(),
      period: { startDate, endDate },
      sections: {
        incidents: {
          total: incidents.length,
          serious: incidents.filter(
            (i) => i.incidentType === "SERIOUS_INCIDENT"
          ).length,
          reportable: incidents.filter(
            (i) => i.incidentType === "REPORTABLE_INCIDENT"
          ).length,
          ndisReported: incidents.filter((i) => i.ndisReported).length,
          details: incidents,
        },
        complaints: {
          total: complaints.length,
          resolved: complaints.filter((c) => c.status === "RESOLVED").length,
          avgSatisfaction:
            complaints
              .map((c) => c.satisfactionRating)
              .filter((r): r is number => r !== null)
              .reduce((sum, r, _, arr) => sum + r / arr.length, 0) || 0,
          details: complaints,
        },
        training: {
          totalRecords: trainingRecords.length,
          expiring: trainingRecords.filter(
            (t) => t.expiryDate && t.expiryDate <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
          ).length,
          details: trainingRecords,
        },
        workerVerification: {
          totalWorkers: workers.length,
          verified: workers.filter((w) => w.status === "VERIFIED").length,
          verificationBreakdown: this.calculateVerificationBreakdown(workers),
        },
        policies: {
          total: policies.length,
          active: policies.filter((p) => p.status === "ACTIVE").length,
          acknowledgmentRate: await this.calculateAcknowledgmentRate(policies),
        },
        risks: {
          total: risks.length,
          byLevel: this.groupRisksByLevel(risks),
          mitigated: risks.filter((r) => r.status === "MITIGATED").length,
        },
      },
    };
  }

  /**
   * Calculate verification breakdown
   */
  private calculateVerificationBreakdown(workers: any[]) {
    const breakdown: Record<string, number> = {};

    workers.forEach((worker) => {
      worker.verifications.forEach((v: any) => {
        const key = `${v.verificationType}_${v.status}`;
        breakdown[key] = (breakdown[key] || 0) + 1;
      });
    });

    return breakdown;
  }

  /**
   * Calculate policy acknowledgment rate
   */
  private async calculateAcknowledgmentRate(policies: any[]): Promise<number> {
    let totalAssigned = 0;
    let totalAcknowledged = 0;

    for (const policy of policies) {
      const assignments = await prisma.policyAssignment.count({
        where: { policyId: policy.id },
      });
      const acknowledgments = await prisma.policyAcknowledgment.count({
        where: { policyId: policy.id },
      });

      totalAssigned += assignments;
      totalAcknowledged += acknowledgments;
    }

    return totalAssigned > 0
      ? (totalAcknowledged / totalAssigned) * 100
      : 0;
  }

  /**
   * Group risks by level
   */
  private groupRisksByLevel(risks: any[]): Record<string, number> {
    const grouped: Record<string, number> = {};

    risks.forEach((risk) => {
      grouped[risk.riskLevel] = (grouped[risk.riskLevel] || 0) + 1;
    });

    return grouped;
  }
}
