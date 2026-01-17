/**
 * MapAble Core - Unified Notification Service
 * Manages notifications across all channels (in-app, email, SMS, push)
 */

import {
  PrismaClient,
  Notification,
  NotificationChannel,
  NotificationType,
  ServiceType,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export interface CreateNotificationInput {
  userId: string;
  messageId?: string;
  channel: NotificationChannel;
  type: NotificationType;
  title: string;
  content: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface SendNotificationInput extends CreateNotificationInput {
  sendImmediately?: boolean;
}

export class NotificationService {
  private db: PrismaClient;

  constructor(db: PrismaClient = prisma) {
    this.db = db;
  }

  /**
   * Create a notification
   */
  async createNotification(
    input: CreateNotificationInput
  ): Promise<Notification> {
    try {
      const notification = await this.db.notification.create({
        data: {
          userId: input.userId,
          messageId: input.messageId,
          channel: input.channel,
          type: input.type,
          title: input.title,
          content: input.content,
          actionUrl: input.actionUrl,
          metadata: input.metadata as Prisma.JsonValue,
        },
      });

      logger.info("Notification created", {
        notificationId: notification.id,
        userId: input.userId,
        channel: input.channel,
        type: input.type,
      });

      return notification;
    } catch (error) {
      logger.error("Failed to create notification", error);
      throw error;
    }
  }

  /**
   * Send notification (create and mark as sent)
   */
  async sendNotification(
    input: SendNotificationInput
  ): Promise<Notification> {
    const notification = await this.createNotification(input);

    if (input.sendImmediately !== false) {
      await this.markAsSent(notification.id);
    }

    return notification;
  }

  /**
   * Get notification by ID
   */
  async getNotification(
    notificationId: string
  ): Promise<Notification | null> {
    return this.db.notification.findUnique({
      where: { id: notificationId },
    });
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    options?: {
      channel?: NotificationChannel;
      type?: NotificationType;
      isRead?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<Notification[]> {
    return this.db.notification.findMany({
      where: {
        userId,
        ...(options?.channel && { channel: options.channel }),
        ...(options?.type && { type: options.type }),
        ...(options?.isRead !== undefined && { isRead: options.isRead }),
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit,
      skip: options?.offset,
    });
  }

  /**
   * Mark notification as sent
   */
  async markAsSent(notificationId: string): Promise<Notification> {
    return this.db.notification.update({
      where: { id: notificationId },
      data: {
        sentAt: new Date(),
      },
    });
  }

  /**
   * Mark notification as delivered
   */
  async markAsDelivered(notificationId: string): Promise<Notification> {
    return this.db.notification.update({
      where: { id: notificationId },
      data: {
        deliveredAt: new Date(),
      },
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    return this.db.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.db.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(
    userId: string,
    channel?: NotificationChannel
  ): Promise<number> {
    return this.db.notification.count({
      where: {
        userId,
        isRead: false,
        ...(channel && { channel }),
      },
    });
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(
    userIds: string[],
    input: Omit<CreateNotificationInput, "userId">
  ): Promise<Notification[]> {
    const notifications = await Promise.all(
      userIds.map((userId) =>
        this.sendNotification({
          ...input,
          userId,
          sendImmediately: true,
        })
      )
    );

    logger.info("Bulk notifications sent", {
      count: notifications.length,
      type: input.type,
    });

    return notifications;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
