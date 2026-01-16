import { prisma } from "../../prisma";
import type { RiskLevel, RiskStatus } from "@prisma/client";

export interface CreateRiskData {
  title: string;
  description: string;
  riskLevel: RiskLevel;
  category: string;
  identifiedBy: string;
  participantId?: string;
  owner?: string;
  mitigationPlan?: string;
  mitigationDate?: Date;
  reviewDate?: Date;
}

export interface UpdateRiskData {
  title?: string;
  description?: string;
  riskLevel?: RiskLevel;
  status?: RiskStatus;
  owner?: string;
  mitigationPlan?: string;
  mitigationDate?: Date;
  reviewDate?: Date;
}

export interface CreateMitigationData {
  action: string;
  responsible: string;
  dueDate: Date;
  status?: string;
}

export class RiskService {
  /**
   * Create a new risk
   */
  async createRisk(data: CreateRiskData) {
    const risk = await prisma.risk.create({
      data: {
        title: data.title,
        description: data.description,
        riskLevel: data.riskLevel,
        category: data.category,
        identifiedBy: data.identifiedBy,
        participantId: data.participantId,
        owner: data.owner,
        mitigationPlan: data.mitigationPlan,
        mitigationDate: data.mitigationDate,
        reviewDate: data.reviewDate,
        status: "IDENTIFIED",
      },
    });

    return risk;
  }

  /**
   * Get risk by ID
   */
  async getRisk(riskId: string) {
    const risk = await prisma.risk.findUnique({
      where: { id: riskId },
      include: {
        participant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        mitigations: {
          orderBy: {
            dueDate: "asc",
          },
        },
      },
    });

    return risk;
  }

  /**
   * Get all risks with filters
   */
  async getRisks(filters?: {
    riskLevel?: RiskLevel;
    status?: RiskStatus;
    category?: string;
    participantId?: string;
  }) {
    const where: any = {};

    if (filters?.riskLevel) {
      where.riskLevel = filters.riskLevel;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.participantId) {
      where.participantId = filters.participantId;
    }

    const risks = await prisma.risk.findMany({
      where,
      include: {
        participant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            mitigations: true,
          },
        },
      },
      orderBy: [
        { riskLevel: "desc" }, // Critical first
        { identifiedAt: "desc" },
      ],
    });

    return risks;
  }

  /**
   * Update risk
   */
  async updateRisk(riskId: string, data: UpdateRiskData) {
    const risk = await prisma.risk.update({
      where: { id: riskId },
      data,
    });

    return risk;
  }

  /**
   * Add mitigation action
   */
  async addMitigation(riskId: string, data: CreateMitigationData) {
    const mitigation = await prisma.riskMitigation.create({
      data: {
        riskId,
        action: data.action,
        responsible: data.responsible,
        dueDate: data.dueDate,
        status: data.status || "Planned",
      },
    });

    // Update risk status if mitigations are added
    await prisma.risk.update({
      where: { id: riskId },
      data: {
        status: "MITIGATED",
      },
    });

    return mitigation;
  }

  /**
   * Complete mitigation
   */
  async completeMitigation(mitigationId: string) {
    const mitigation = await prisma.riskMitigation.update({
      where: { id: mitigationId },
      data: {
        status: "Completed",
        completedAt: new Date(),
      },
    });

    // Check if all mitigations are completed
    const risk = await prisma.risk.findUnique({
      where: { id: mitigation.riskId },
      include: {
        mitigations: true,
      },
    });

    if (risk) {
      const allCompleted = risk.mitigations.every(
        (m) => m.status === "Completed" || m.completedAt !== null
      );

      if (allCompleted) {
        await prisma.risk.update({
          where: { id: risk.id },
          data: {
            status: "CLOSED",
          },
        });
      }
    }

    return mitigation;
  }

  /**
   * Get risks by level
   */
  async getRisksByLevel() {
    const risks = await prisma.risk.groupBy({
      by: ["riskLevel"],
      where: {
        status: {
          not: "CLOSED",
        },
      },
      _count: true,
    });

    return risks.reduce(
      (acc, item) => ({ ...acc, [item.riskLevel]: item._count }),
      {} as Record<string, number>
    );
  }

  /**
   * Get risks due for review
   */
  async getRisksDueForReview() {
    const now = new Date();
    const risks = await prisma.risk.findMany({
      where: {
        status: {
          in: ["IDENTIFIED", "ASSESSED", "MITIGATED", "MONITORED"],
        },
        reviewDate: {
          lte: now,
        },
      },
      orderBy: {
        reviewDate: "asc",
      },
    });

    return risks;
  }
}
