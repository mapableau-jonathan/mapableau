import { prisma } from "../../prisma";
import type { ComplaintStatus, ComplaintSource } from "@prisma/client";

export interface CreateComplaintData {
  source: ComplaintSource;
  description: string;
  participantId?: string;
  workerId?: string;
  serviceArea?: string;
}

export interface UpdateComplaintData {
  status?: ComplaintStatus;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolution?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  satisfactionRating?: number;
}

export interface CreateResolutionData {
  action: string;
  takenBy: string;
  outcome?: string;
}

export class ComplaintService {
  /**
   * Generate unique complaint number
   */
  private generateComplaintNumber(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `CMP-${timestamp}-${random}`;
  }

  /**
   * Create a new complaint
   */
  async createComplaint(data: CreateComplaintData) {
    const complaintNumber = this.generateComplaintNumber();

    const complaint = await prisma.complaint.create({
      data: {
        complaintNumber,
        source: data.source,
        description: data.description,
        participantId: data.participantId,
        workerId: data.workerId,
        serviceArea: data.serviceArea,
        status: "RECEIVED",
      },
    });

    return complaint;
  }

  /**
   * Get complaint by ID
   */
  async getComplaint(complaintId: string) {
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
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
        resolutions: {
          orderBy: {
            takenAt: "desc",
          },
        },
      },
    });

    return complaint;
  }

  /**
   * Get all complaints with filters
   */
  async getComplaints(filters?: {
    source?: ComplaintSource;
    status?: ComplaintStatus;
    participantId?: string;
    serviceArea?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};

    if (filters?.source) {
      where.source = filters.source;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.participantId) {
      where.participantId = filters.participantId;
    }

    if (filters?.serviceArea) {
      where.serviceArea = filters.serviceArea;
    }

    if (filters?.startDate || filters?.endDate) {
      where.receivedAt = {};
      if (filters.startDate) {
        where.receivedAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.receivedAt.lte = filters.endDate;
      }
    }

    const complaints = await prisma.complaint.findMany({
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
        _count: {
          select: {
            resolutions: true,
          },
        },
      },
      orderBy: {
        receivedAt: "desc",
      },
    });

    return complaints;
  }

  /**
   * Update complaint
   */
  async updateComplaint(complaintId: string, data: UpdateComplaintData) {
    const complaint = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: data.status,
        acknowledgedAt: data.acknowledgedAt,
        acknowledgedBy: data.acknowledgedBy,
        resolution: data.resolution,
        resolvedAt: data.resolvedAt,
        resolvedBy: data.resolvedBy,
        satisfactionRating: data.satisfactionRating,
      },
    });

    return complaint;
  }

  /**
   * Acknowledge complaint
   */
  async acknowledgeComplaint(complaintId: string, acknowledgedBy: string) {
    const complaint = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: "ACKNOWLEDGED",
        acknowledgedAt: new Date(),
        acknowledgedBy,
      },
    });

    return complaint;
  }

  /**
   * Add resolution action
   */
  async addResolution(complaintId: string, data: CreateResolutionData) {
    const resolution = await prisma.complaintResolution.create({
      data: {
        complaintId,
        action: data.action,
        takenBy: data.takenBy,
        outcome: data.outcome,
      },
    });

    return resolution;
  }

  /**
   * Resolve complaint
   */
  async resolveComplaint(
    complaintId: string,
    resolution: string,
    resolvedBy: string,
    satisfactionRating?: number
  ) {
    const complaint = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: "RESOLVED",
        resolution,
        resolvedAt: new Date(),
        resolvedBy,
        satisfactionRating,
      },
    });

    return complaint;
  }

  /**
   * Get complaint statistics
   */
  async getComplaintStatistics(startDate?: Date, endDate?: Date) {
    const where: any = {};

    if (startDate || endDate) {
      where.receivedAt = {};
      if (startDate) where.receivedAt.gte = startDate;
      if (endDate) where.receivedAt.lte = endDate;
    }

    const [total, bySource, byStatus, byServiceArea, resolved, avgSatisfaction] =
      await Promise.all([
        prisma.complaint.count({ where }),
        prisma.complaint.groupBy({
          by: ["source"],
          where,
          _count: true,
        }),
        prisma.complaint.groupBy({
          by: ["status"],
          where,
          _count: true,
        }),
        prisma.complaint.groupBy({
          by: ["serviceArea"],
          where,
          _count: true,
        }),
        prisma.complaint.count({
          where: { ...where, status: "RESOLVED" },
        }),
        prisma.complaint.aggregate({
          where: {
            ...where,
            satisfactionRating: { not: null },
          },
          _avg: {
            satisfactionRating: true,
          },
        }),
      ]);

    return {
      total,
      bySource: bySource.reduce(
        (acc, item) => ({ ...acc, [item.source]: item._count }),
        {} as Record<string, number>
      ),
      byStatus: byStatus.reduce(
        (acc, item) => ({ ...acc, [item.status]: item._count }),
        {} as Record<string, number>
      ),
      byServiceArea: byServiceArea.reduce(
        (acc, item) => ({
          ...acc,
          [item.serviceArea || "Unknown"]: item._count,
        }),
        {} as Record<string, number>
      ),
      resolved,
      avgSatisfaction: avgSatisfaction._avg.satisfactionRating || 0,
    };
  }
}
