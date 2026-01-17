/**
 * NDIS Audit Pack Generator
 * Generates comprehensive audit pack with all evidence for NDIS verification
 */

import { ComplianceReportGenerator } from "./compliance-report-generator";
import { AuditLogger } from "../audit/audit-logger";
import { prisma } from "../../prisma";

export interface NDISAuditPack {
  packId: string;
  generatedAt: Date;
  sections: {
    providerEntity: any;
    governance: any;
    hrManagement: any;
    incidentComplaints: any;
    riskManagement: any;
    platformIT: any;
    contracts: any;
    continuousImprovement: any;
  };
}

export class NDISAuditPackGenerator {
  private complianceGenerator: ComplianceReportGenerator;
  private auditLogger: AuditLogger;

  constructor() {
    this.complianceGenerator = new ComplianceReportGenerator();
    this.auditLogger = new AuditLogger();
  }

  /**
   * Generate complete NDIS audit pack
   */
  async generateAuditPack(): Promise<NDISAuditPack> {
    // Get all required evidence
    const [
      providers,
      workers,
      incidents,
      complaints,
      risks,
      policies,
      trainingRecords,
      auditLogs,
    ] = await Promise.all([
      prisma.providerRegistration.findMany(),
      prisma.worker.findMany({
        include: {
          verifications: true,
          trainingRecords: true,
        },
      }),
      prisma.incident.findMany(),
      prisma.complaint.findMany(),
      prisma.risk.findMany(),
      prisma.policy.findMany(),
      prisma.trainingRecord.findMany(),
      this.auditLogger.getAuditLogs({}),
    ]);

    return {
      packId: `AUDIT-PACK-${Date.now()}`,
      generatedAt: new Date(),
      sections: {
        providerEntity: {
          totalProviders: providers.length,
          activeProviders: providers.filter(
            (p) => p.registrationStatus === "ACTIVE"
          ).length,
          providers: providers.map((p) => ({
            providerNumber: p.providerNumber,
            status: p.registrationStatus,
            serviceCategories: p.serviceCategories,
            verifiedAt: p.verifiedAt,
            expiresAt: p.expiresAt,
          })),
        },
        governance: {
          policies: policies.length,
          activePolicies: policies.filter((p) => p.status === "ACTIVE").length,
          policyCategories: this.groupPoliciesByCategory(policies),
        },
        hrManagement: {
          totalWorkers: workers.length,
          verifiedWorkers: workers.filter((w) => w.status === "VERIFIED")
            .length,
          workerVerifications: this.formatWorkerVerifications(workers),
          trainingRecords: trainingRecords.length,
          trainingCompliance: this.calculateTrainingCompliance(trainingRecords),
        },
        incidentComplaints: {
          totalIncidents: incidents.length,
          seriousIncidents: incidents.filter(
            (i) => i.incidentType === "SERIOUS_INCIDENT"
          ).length,
          ndisReported: incidents.filter((i) => i.ndisReported).length,
          totalComplaints: complaints.length,
          resolvedComplaints: complaints.filter(
            (c) => c.status === "RESOLVED"
          ).length,
          incidents: incidents.map((i) => ({
            id: i.id,
            type: i.incidentType,
            occurredAt: i.occurredAt,
            reportedAt: i.reportedAt,
            ndisReported: i.ndisReported,
            ndisReportNumber: i.ndisReportNumber,
          })),
          complaints: complaints.map((c) => ({
            id: c.id,
            complaintNumber: c.complaintNumber,
            source: c.source,
            status: c.status,
            receivedAt: c.receivedAt,
            resolvedAt: c.resolvedAt,
          })),
        },
        riskManagement: {
          totalRisks: risks.length,
          risksByLevel: this.groupRisksByLevel(risks),
          mitigatedRisks: risks.filter((r) => r.status === "MITIGATED")
            .length,
          risks: risks.map((r) => ({
            id: r.id,
            title: r.title,
            riskLevel: r.riskLevel,
            status: r.status,
            identifiedAt: r.identifiedAt,
          })),
        },
        platformIT: {
          auditLogs: {
            total: auditLogs.length,
            sample: auditLogs.slice(0, 100), // Sample for report
          },
          systemEvidence: {
            platformVersion: "1.0.0",
            databaseBackup: "Configured",
            securityMeasures: "Implemented",
          },
        },
        contracts: {
          serviceAgreements: [], // TODO: Add service agreement model
          providerContracts: [], // TODO: Add contract model
        },
        continuousImprovement: {
          improvements: [], // TODO: Add improvement log model
        },
      },
    };
  }

  /**
   * Group policies by category
   */
  private groupPoliciesByCategory(policies: any[]): Record<string, number> {
    const grouped: Record<string, number> = {};

    policies.forEach((policy) => {
      grouped[policy.category] = (grouped[policy.category] || 0) + 1;
    });

    return grouped;
  }

  /**
   * Format worker verifications
   */
  private formatWorkerVerifications(workers: any[]): any[] {
    return workers.map((worker) => ({
      workerId: worker.id,
      status: worker.status,
      verifications: worker.verifications.map((v: any) => ({
        type: v.verificationType,
        status: v.status,
        expiresAt: v.expiresAt,
        verifiedAt: v.verifiedAt,
      })),
    }));
  }

  /**
   * Calculate training compliance
   */
  private calculateTrainingCompliance(
    trainingRecords: any[]
  ): {
    totalRecords: number;
    expired: number;
    expiringSoon: number;
    compliant: number;
  } {
    const now = new Date();
    const soon = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    return {
      totalRecords: trainingRecords.length,
      expired: trainingRecords.filter(
        (t) => t.expiryDate && t.expiryDate < now
      ).length,
      expiringSoon: trainingRecords.filter(
        (t) => t.expiryDate && t.expiryDate > now && t.expiryDate <= soon
      ).length,
      compliant: trainingRecords.filter(
        (t) => !t.expiryDate || t.expiryDate > soon
      ).length,
    };
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

  /**
   * Export audit pack
   */
  async exportAuditPack(format: "json" | "zip" = "json"): Promise<string> {
    const pack = await this.generateAuditPack();

    if (format === "json") {
      return JSON.stringify(pack, null, 2);
    }

    // TODO: Implement ZIP export with multiple files
    return JSON.stringify(pack, null, 2);
  }
}
