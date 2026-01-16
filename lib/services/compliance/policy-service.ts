import { prisma } from "../../prisma";
import type { PolicyStatus, PolicyCategory } from "@prisma/client";

export interface CreatePolicyData {
  title: string;
  category: PolicyCategory;
  version: string;
  content: Record<string, unknown>;
  effectiveDate: Date;
  reviewDate?: Date;
  createdBy: string;
}

export interface UpdatePolicyData {
  title?: string;
  content?: Record<string, unknown>;
  status?: PolicyStatus;
  effectiveDate?: Date;
  reviewDate?: Date;
  nextReviewDate?: Date;
}

export class PolicyService {
  /**
   * Create a new policy
   */
  async createPolicy(data: CreatePolicyData) {
    const policy = await prisma.policy.create({
      data: {
        title: data.title,
        category: data.category,
        version: data.version,
        content: data.content as any,
        effectiveDate: data.effectiveDate,
        reviewDate: data.reviewDate,
        createdBy: data.createdBy,
        status: "DRAFT",
      },
    });

    return policy;
  }

  /**
   * Get policy by ID
   */
  async getPolicy(policyId: string) {
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      include: {
        acknowledgments: {
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
        assignedUsers: {
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

    return policy;
  }

  /**
   * Get all policies with filters
   */
  async getPolicies(filters?: {
    category?: PolicyCategory;
    status?: PolicyStatus;
    search?: string;
  }) {
    const where: any = {};

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.title = {
        contains: filters.search,
        mode: "insensitive",
      };
    }

    const policies = await prisma.policy.findMany({
      where,
      orderBy: {
        effectiveDate: "desc",
      },
      include: {
        _count: {
          select: {
            acknowledgments: true,
            assignedUsers: true,
          },
        },
      },
    });

    return policies;
  }

  /**
   * Update policy
   */
  async updatePolicy(policyId: string, data: UpdatePolicyData) {
    const policy = await prisma.policy.update({
      where: { id: policyId },
      data: {
        ...data,
        content: data.content as any,
      },
    });

    return policy;
  }

  /**
   * Approve policy
   */
  async approvePolicy(policyId: string, approvedBy: string) {
    const policy = await prisma.policy.update({
      where: { id: policyId },
      data: {
        status: "ACTIVE",
        approvedBy,
        approvedAt: new Date(),
      },
    });

    return policy;
  }

  /**
   * Assign policy to users
   */
  async assignPolicy(
    policyId: string,
    userIds: string[],
    assignedBy: string
  ) {
    const assignments = await Promise.all(
      userIds.map((userId) =>
        prisma.policyAssignment.upsert({
          where: {
            policyId_userId: {
              policyId,
              userId,
            },
          },
          create: {
            policyId,
            userId,
            assignedBy,
          },
          update: {
            assignedBy,
            assignedAt: new Date(),
          },
        })
      )
    );

    return assignments;
  }

  /**
   * Acknowledge policy
   */
  async acknowledgePolicy(
    policyId: string,
    userId: string,
    signature?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const acknowledgment = await prisma.policyAcknowledgment.upsert({
      where: {
        policyId_userId: {
          policyId,
          userId,
        },
      },
      create: {
        policyId,
        userId,
        signature,
        ipAddress,
        userAgent,
      },
      update: {
        acknowledgedAt: new Date(),
        signature,
        ipAddress,
        userAgent,
      },
    });

    return acknowledgment;
  }

  /**
   * Get policies assigned to a user
   */
  async getUserPolicies(userId: string) {
    const assignments = await prisma.policyAssignment.findMany({
      where: { userId },
      include: {
        policy: {
          include: {
            _count: {
              select: {
                acknowledgments: true,
              },
            },
          },
        },
      },
    });

    return assignments.map((a) => ({
      ...a.policy,
      isAcknowledged: a.policy._count.acknowledgments > 0,
    }));
  }

  /**
   * Get acknowledgment status for a policy
   */
  async getAcknowledgmentStatus(policyId: string) {
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      include: {
        assignedUsers: {
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
        acknowledgments: {
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

    if (!policy) {
      return null;
    }

    const totalAssigned = policy.assignedUsers.length;
    const totalAcknowledged = policy.acknowledgments.length;
    const pending = policy.assignedUsers.filter(
      (assignment) =>
        !policy.acknowledgments.some(
          (ack) => ack.userId === assignment.userId
        )
    );

    return {
      policy,
      totalAssigned,
      totalAcknowledged,
      pendingCount: pending.length,
      acknowledgmentRate:
        totalAssigned > 0 ? (totalAcknowledged / totalAssigned) * 100 : 0,
      pendingUsers: pending.map((p) => p.user),
    };
  }

  /**
   * Get policies due for review
   */
  async getPoliciesDueForReview() {
    const now = new Date();
    const policies = await prisma.policy.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          {
            reviewDate: {
              lte: now,
            },
          },
          {
            nextReviewDate: {
              lte: now,
            },
          },
        ],
      },
      orderBy: {
        reviewDate: "asc",
      },
    });

    return policies;
  }
}
