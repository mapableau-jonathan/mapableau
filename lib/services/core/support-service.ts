/**
 * MapAble Core - Support Center Service
 * Manages support tickets, helpdesk, and customer support
 */

import {
  PrismaClient,
  SupportTicket,
  SupportTicketStatus,
  SupportTicketPriority,
  SupportTicketCategory,
  ServiceType,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export interface CreateTicketInput {
  userId: string;
  serviceType?: ServiceType;
  category: SupportTicketCategory;
  priority?: SupportTicketPriority;
  subject: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateTicketInput {
  status?: SupportTicketStatus;
  assignedTo?: string;
  priority?: SupportTicketPriority;
  metadata?: Record<string, unknown>;
}

export interface ResolveTicketInput {
  resolvedBy: string;
  resolution: string;
}

export interface AddResponseInput {
  ticketId: string;
  userId: string;
  isStaffResponse: boolean;
  content: string;
  attachments?: string[];
}

export class SupportService {
  private db: PrismaClient;

  constructor(db: PrismaClient = prisma) {
    this.db = db;
  }

  /**
   * Generate unique ticket number
   */
  private async generateTicketNumber(): Promise<string> {
    const prefix = "TKT";
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Create a new support ticket
   */
  async createTicket(input: CreateTicketInput): Promise<SupportTicket> {
    try {
      const ticketNumber = await this.generateTicketNumber();

      const ticket = await this.db.supportTicket.create({
        data: {
          ticketNumber,
          userId: input.userId,
          serviceType: input.serviceType,
          category: input.category,
          priority: input.priority ?? SupportTicketPriority.NORMAL,
          status: SupportTicketStatus.OPEN,
          subject: input.subject,
          description: input.description,
          metadata: input.metadata as Prisma.JsonValue,
        },
      });

      logger.info("Support ticket created", {
        ticketId: ticket.id,
        ticketNumber,
        userId: input.userId,
        category: input.category,
      });

      return ticket;
    } catch (error) {
      logger.error("Failed to create support ticket", error);
      throw error;
    }
  }

  /**
   * Get ticket by ID
   */
  async getTicket(ticketId: string): Promise<SupportTicket | null> {
    return this.db.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        responses: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  /**
   * Get ticket by ticket number
   */
  async getTicketByNumber(
    ticketNumber: string
  ): Promise<SupportTicket | null> {
    return this.db.supportTicket.findUnique({
      where: { ticketNumber },
      include: {
        responses: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  /**
   * Get tickets for a user
   */
  async getUserTickets(
    userId: string,
    options?: {
      status?: SupportTicketStatus;
      category?: SupportTicketCategory;
      serviceType?: ServiceType;
      limit?: number;
      offset?: number;
    }
  ): Promise<SupportTicket[]> {
    return this.db.supportTicket.findMany({
      where: {
        userId,
        ...(options?.status && { status: options.status }),
        ...(options?.category && { category: options.category }),
        ...(options?.serviceType && { serviceType: options.serviceType }),
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit,
      skip: options?.offset,
      include: {
        responses: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  /**
   * Get tickets assigned to a staff member
   */
  async getAssignedTickets(
    staffId: string,
    options?: {
      status?: SupportTicketStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<SupportTicket[]> {
    return this.db.supportTicket.findMany({
      where: {
        assignedTo: staffId,
        ...(options?.status && { status: options.status }),
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit,
      skip: options?.offset,
    });
  }

  /**
   * Update ticket
   */
  async updateTicket(
    ticketId: string,
    input: UpdateTicketInput
  ): Promise<SupportTicket> {
    try {
      const ticket = await this.db.supportTicket.update({
        where: { id: ticketId },
        data: {
          ...(input.status && { status: input.status }),
          ...(input.assignedTo && { assignedTo: input.assignedTo }),
          ...(input.priority && { priority: input.priority }),
          ...(input.metadata && { metadata: input.metadata as Prisma.JsonObject }),
        },
      });

      logger.info("Support ticket updated", {
        ticketId,
        updates: input,
      });

      return ticket;
    } catch (error) {
      logger.error("Failed to update support ticket", error);
      throw error;
    }
  }

  /**
   * Resolve ticket
   */
  async resolveTicket(
    ticketId: string,
    input: ResolveTicketInput
  ): Promise<SupportTicket> {
    try {
      const ticket = await this.db.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: SupportTicketStatus.RESOLVED,
          resolvedAt: new Date(),
          resolvedBy: input.resolvedBy,
          resolution: input.resolution,
        },
      });

      logger.info("Support ticket resolved", {
        ticketId,
        resolvedBy: input.resolvedBy,
      });

      return ticket;
    } catch (error) {
      logger.error("Failed to resolve support ticket", error);
      throw error;
    }
  }

  /**
   * Add response to ticket
   */
  async addResponse(input: AddResponseInput): Promise<void> {
    try {
      await this.db.supportTicketResponse.create({
        data: {
          ticketId: input.ticketId,
          userId: input.userId,
          isStaffResponse: input.isStaffResponse,
          content: input.content,
          attachments: input.attachments ?? [],
        },
      });

      // Update ticket status if customer responds
      if (!input.isStaffResponse) {
        await this.updateTicket(input.ticketId, {
          status: SupportTicketStatus.WAITING_CUSTOMER,
        });
      } else {
        await this.updateTicket(input.ticketId, {
          status: SupportTicketStatus.IN_PROGRESS,
        });
      }

      logger.info("Response added to ticket", {
        ticketId: input.ticketId,
        isStaffResponse: input.isStaffResponse,
      });
    } catch (error) {
      logger.error("Failed to add response to ticket", error);
      throw error;
    }
  }

  /**
   * Escalate ticket
   */
  async escalateTicket(ticketId: string): Promise<SupportTicket> {
    return this.updateTicket(ticketId, {
      status: SupportTicketStatus.ESCALATED,
      priority: SupportTicketPriority.URGENT,
    });
  }

  /**
   * Close ticket
   */
  async closeTicket(ticketId: string): Promise<SupportTicket> {
    return this.updateTicket(ticketId, {
      status: SupportTicketStatus.CLOSED,
    });
  }

  /**
   * Get ticket statistics
   */
  async getTicketStats(options?: {
    serviceType?: ServiceType;
    assignedTo?: string;
  }) {
    const [open, inProgress, resolved, closed, escalated] = await Promise.all([
      this.db.supportTicket.count({
        where: {
          status: SupportTicketStatus.OPEN,
          ...(options?.serviceType && { serviceType: options.serviceType }),
          ...(options?.assignedTo && { assignedTo: options.assignedTo }),
        },
      }),
      this.db.supportTicket.count({
        where: {
          status: SupportTicketStatus.IN_PROGRESS,
          ...(options?.serviceType && { serviceType: options.serviceType }),
          ...(options?.assignedTo && { assignedTo: options.assignedTo }),
        },
      }),
      this.db.supportTicket.count({
        where: {
          status: SupportTicketStatus.RESOLVED,
          ...(options?.serviceType && { serviceType: options.serviceType }),
          ...(options?.assignedTo && { assignedTo: options.assignedTo }),
        },
      }),
      this.db.supportTicket.count({
        where: {
          status: SupportTicketStatus.CLOSED,
          ...(options?.serviceType && { serviceType: options.serviceType }),
          ...(options?.assignedTo && { assignedTo: options.assignedTo }),
        },
      }),
      this.db.supportTicket.count({
        where: {
          status: SupportTicketStatus.ESCALATED,
          ...(options?.serviceType && { serviceType: options.serviceType }),
          ...(options?.assignedTo && { assignedTo: options.assignedTo }),
        },
      }),
    ]);

    return {
      open,
      inProgress,
      resolved,
      closed,
      escalated,
      total: open + inProgress + resolved + closed + escalated,
    };
  }
}

// Export singleton instance
export const supportService = new SupportService();
