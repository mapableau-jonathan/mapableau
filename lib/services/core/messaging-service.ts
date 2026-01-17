/**
 * MapAble Core - Unified Messaging Service
 * Manages cross-application messaging between users, providers, and administrators
 */

import {
  PrismaClient,
  Message,
  MessageType,
  MessageStatus,
  MessagePriority,
  ServiceType,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export interface CreateMessageInput {
  userId: string;
  threadId?: string;
  type: MessageType;
  subject?: string;
  content: string;
  priority?: MessagePriority;
  serviceType?: ServiceType;
  metadata?: Record<string, unknown>;
}

export interface SendMessageInput extends CreateMessageInput {
  sendImmediately?: boolean;
}

export class MessagingService {
  private db: PrismaClient;

  constructor(db: PrismaClient = prisma) {
    this.db = db;
  }

  /**
   * Create a new message
   */
  async createMessage(input: CreateMessageInput): Promise<Message> {
    try {
      // Generate thread ID if not provided
      const threadId =
        input.threadId ??
        `thread-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const message = await this.db.message.create({
        data: {
          userId: input.userId,
          threadId,
          type: input.type,
          subject: input.subject,
          content: input.content,
          priority: input.priority ?? MessagePriority.NORMAL,
          serviceType: input.serviceType,
          metadata: input.metadata as Prisma.JsonValue,
          status: MessageStatus.DRAFT,
        },
      });

      logger.info("Message created", {
        messageId: message.id,
        userId: input.userId,
        type: input.type,
      });

      return message;
    } catch (error) {
      logger.error("Failed to create message", error);
      throw error;
    }
  }

  /**
   * Send a message (create and mark as sent)
   */
  async sendMessage(input: SendMessageInput): Promise<Message> {
    const message = await this.createMessage(input);

    if (input.sendImmediately !== false) {
      return this.markAsSent(message.id);
    }

    return message;
  }

  /**
   * Get message by ID
   */
  async getMessage(messageId: string): Promise<Message | null> {
    return this.db.message.findUnique({
      where: { id: messageId },
    });
  }

  /**
   * Get messages for a user
   */
  async getUserMessages(
    userId: string,
    options?: {
      threadId?: string;
      type?: MessageType;
      status?: MessageStatus;
      serviceType?: ServiceType;
      limit?: number;
      offset?: number;
    }
  ): Promise<Message[]> {
    return this.db.message.findMany({
      where: {
        userId,
        ...(options?.threadId && { threadId: options.threadId }),
        ...(options?.type && { type: options.type }),
        ...(options?.status && { status: options.status }),
        ...(options?.serviceType && { serviceType: options.serviceType }),
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit,
      skip: options?.offset,
    });
  }

  /**
   * Get message thread
   */
  async getMessageThread(threadId: string): Promise<Message[]> {
    return this.db.message.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Mark message as sent
   */
  async markAsSent(messageId: string): Promise<Message> {
    return this.db.message.update({
      where: { id: messageId },
      data: {
        status: MessageStatus.SENT,
        sentAt: new Date(),
      },
    });
  }

  /**
   * Mark message as delivered
   */
  async markAsDelivered(messageId: string): Promise<Message> {
    return this.db.message.update({
      where: { id: messageId },
      data: {
        status: MessageStatus.DELIVERED,
        deliveredAt: new Date(),
      },
    });
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<Message> {
    return this.db.message.update({
      where: { id: messageId },
      data: {
        status: MessageStatus.READ,
        readAt: new Date(),
      },
    });
  }

  /**
   * Get unread message count for a user
   */
  async getUnreadCount(
    userId: string,
    serviceType?: ServiceType
  ): Promise<number> {
    return this.db.message.count({
      where: {
        userId,
        status: { in: [MessageStatus.SENT, MessageStatus.DELIVERED] },
        ...(serviceType && { serviceType }),
      },
    });
  }

  /**
   * Archive a message
   */
  async archiveMessage(messageId: string): Promise<Message> {
    return this.db.message.update({
      where: { id: messageId },
      data: {
        status: MessageStatus.ARCHIVED,
      },
    });
  }

  /**
   * Delete a message (soft delete by archiving)
   */
  async deleteMessage(messageId: string): Promise<void> {
    await this.archiveMessage(messageId);
  }
}

// Export singleton instance
export const messagingService = new MessagingService();
