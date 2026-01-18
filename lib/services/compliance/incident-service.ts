import { prisma } from "../../prisma";
import type { IncidentType, IncidentStatus } from "@prisma/client";

export interface CreateIncidentData {
  incidentType: IncidentType;
  description: string;
  occurredAt: Date;
  reportedBy: string;
  participantId?: string;
  workerId?: string;
  location?: string;
}

export interface UpdateIncidentData {
  description?: string;
  status?: IncidentStatus;
  actionsTaken?: Array<{ action: string; takenBy: string; takenAt: Date }>;
  resolution?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  ndisReported?: boolean;
  ndisReportNumber?: string;
  ndisReportedAt?: Date;
}

export class IncidentService {
  /**
   * Create a new incident
   */
  async createIncident(data: CreateIncidentData) {
    // Generate incident number
    const incidentNumber = `INC-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    const incident = await prisma.incident.create({
      data: {
        incidentType: data.incidentType,
        description: data.description,
        occurredAt: data.occurredAt,
        reportedBy: data.reportedBy,
        participantId: data.participantId,
        workerId: data.workerId,
        location: data.location,
        status: "REPORTED",
      },
    });

    // Trigger Notion sync
    try {
      const { onIncidentCreated } = await import("../notion/event-listeners");
      await onIncidentCreated(incident.id);
    } catch (error) {
      // Don't fail if Notion sync fails
      console.warn("Failed to trigger Notion sync for incident", error);
    }

    return incident;
  }

  /**
   * Get incident by ID
   */
  async getIncident(incidentId: string) {
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
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

    return incident;
  }

  /**
   * Get all incidents with filters
   */
  async getIncidents(filters?: {
    incidentType?: IncidentType;
    status?: IncidentStatus;
    participantId?: string;
    workerId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};

    if (filters?.incidentType) {
      where.incidentType = filters.incidentType;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.participantId) {
      where.participantId = filters.participantId;
    }

    if (filters?.workerId) {
      where.workerId = filters.workerId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.occurredAt = {};
      if (filters.startDate) {
        where.occurredAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.occurredAt.lte = filters.endDate;
      }
    }

    const incidents = await prisma.incident.findMany({
      where,
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
      orderBy: {
        occurredAt: "desc",
      },
    });

    return incidents;
  }

  /**
   * Update incident
   */
  /**
   * Update an existing incident
   */
  async updateIncident(incidentId: string, data: UpdateIncidentData) {
    const incident = await prisma.incident.update({
      where: { id: incidentId },
      data: {
        description: data.description,
        status: data.status,
        actionsTaken: data.actionsTaken as any,
        resolution: data.resolution,
        resolvedAt: data.resolvedAt,
        resolvedBy: data.resolvedBy,
        ndisReported: data.ndisReported,
        ndisReportNumber: data.ndisReportNumber,
        ndisReportedAt: data.ndisReportedAt,
      },
    });

    // Trigger Notion sync
    try {
      const { onIncidentUpdated } = await import("../notion/event-listeners");
      await onIncidentUpdated(incident.id);
    } catch (error) {
      // Don't fail if Notion sync fails
      console.warn("Failed to trigger Notion sync for incident update", error);
    }

    return incident;
  }

  /**
   * Report incident to NDIS Commission
   */
  async reportToNDIS(incidentId: string, reportNumber: string) {
    const incident = await prisma.incident.update({
      where: { id: incidentId },
      data: {
        ndisReported: true,
        ndisReportNumber: reportNumber,
        ndisReportedAt: new Date(),
        status: "NDIS_REPORTED",
      },
    });

    return incident;
  }

  /**
   * Get serious incidents requiring NDIS reporting
   */
  async getSeriousIncidents() {
    const incidents = await prisma.incident.findMany({
      where: {
        incidentType: {
          in: ["SERIOUS_INCIDENT", "REPORTABLE_INCIDENT"],
        },
        ndisReported: false,
      },
      include: {
        participant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        occurredAt: "desc",
      },
    });

    return incidents;
  }

  /**
   * Get incident statistics
   */
  async getIncidentStatistics(startDate?: Date, endDate?: Date) {
    const where: any = {};

    if (startDate || endDate) {
      where.occurredAt = {};
      if (startDate) where.occurredAt.gte = startDate;
      if (endDate) where.occurredAt.lte = endDate;
    }

    const [total, byType, byStatus, ndisReported] = await Promise.all([
      prisma.incident.count({ where }),
      prisma.incident.groupBy({
        by: ["incidentType"],
        where,
        _count: true,
      }),
      prisma.incident.groupBy({
        by: ["status"],
        where,
        _count: true,
      }),
      prisma.incident.count({
        where: { ...where, ndisReported: true },
      }),
    ]);

    return {
      total,
      byType: byType.reduce(
        (acc, item) => ({ ...acc, [item.incidentType]: item._count }),
        {} as Record<string, number>
      ),
      byStatus: byStatus.reduce(
        (acc, item) => ({ ...acc, [item.status]: item._count }),
        {} as Record<string, number>
      ),
      ndisReported,
    };
  }
}
