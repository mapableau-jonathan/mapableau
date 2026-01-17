/**
 * MapAble Core - Subscription Service
 * Manages user subscriptions across all MapAble services
 */

import {
  PrismaClient,
  Subscription,
  SubscriptionTier,
  SubscriptionStatus,
  ServiceType,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export interface CreateSubscriptionInput {
  userId: string;
  serviceType?: ServiceType;
  tier: SubscriptionTier;
  startDate?: Date;
  endDate?: Date;
  metadata?: Record<string, unknown>;
}

export interface UpdateSubscriptionInput {
  tier?: SubscriptionTier;
  status?: SubscriptionStatus;
  endDate?: Date;
  metadata?: Record<string, unknown>;
}

export class SubscriptionService {
  private db: PrismaClient;

  constructor(db: PrismaClient = prisma) {
    this.db = db;
  }

  /**
   * Create a new subscription
   */
  async createSubscription(
    input: CreateSubscriptionInput
  ): Promise<Subscription> {
    try {
      const subscription = await this.db.subscription.create({
        data: {
          userId: input.userId,
          serviceType: input.serviceType,
          tier: input.tier,
          status: SubscriptionStatus.ACTIVE,
          startDate: input.startDate ?? new Date(),
          endDate: input.endDate,
          metadata: input.metadata as Prisma.JsonValue,
        },
      });

      logger.info("Subscription created", {
        subscriptionId: subscription.id,
        userId: input.userId,
        tier: input.tier,
      });

      return subscription;
    } catch (error) {
      logger.error("Failed to create subscription", error);
      throw error;
    }
  }

  /**
   * Get subscription by ID
   */
  async getSubscription(subscriptionId: string): Promise<Subscription | null> {
    return this.db.subscription.findUnique({
      where: { id: subscriptionId },
    });
  }

  /**
   * Get user's active subscriptions
   */
  async getUserSubscriptions(
    userId: string,
    serviceType?: ServiceType
  ): Promise<Subscription[]> {
    return this.db.subscription.findMany({
      where: {
        userId,
        ...(serviceType && { serviceType }),
        status: SubscriptionStatus.ACTIVE,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Update subscription
   */
  async updateSubscription(
    subscriptionId: string,
    input: UpdateSubscriptionInput
  ): Promise<Subscription> {
    try {
      const subscription = await this.db.subscription.update({
        where: { id: subscriptionId },
        data: {
          ...(input.tier && { tier: input.tier }),
          ...(input.status && { status: input.status }),
          ...(input.endDate && { endDate: input.endDate }),
          ...(input.metadata && { metadata: input.metadata as Prisma.JsonObject }),
        },
      });

      logger.info("Subscription updated", {
        subscriptionId,
        updates: input,
      });

      return subscription;
    } catch (error) {
      logger.error("Failed to update subscription", error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    reason?: string
  ): Promise<Subscription> {
    try {
      const subscription = await this.db.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: SubscriptionStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: reason,
        },
      });

      logger.info("Subscription cancelled", {
        subscriptionId,
        reason,
      });

      return subscription;
    } catch (error) {
      logger.error("Failed to cancel subscription", error);
      throw error;
    }
  }

  /**
   * Check if user has active premium subscription for a service
   */
  async hasPremiumAccess(
    userId: string,
    serviceType: ServiceType
  ): Promise<boolean> {
    const subscription = await this.db.subscription.findFirst({
      where: {
        userId,
        serviceType,
        tier: { in: [SubscriptionTier.PREMIUM, SubscriptionTier.ENTERPRISE] },
        status: SubscriptionStatus.ACTIVE,
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } },
        ],
      },
    });

    return !!subscription;
  }

  /**
   * Get user's subscription tier for a service
   */
  async getUserTier(
    userId: string,
    serviceType: ServiceType
  ): Promise<SubscriptionTier> {
    const subscription = await this.db.subscription.findFirst({
      where: {
        userId,
        serviceType,
        status: SubscriptionStatus.ACTIVE,
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    return subscription?.tier ?? SubscriptionTier.FREE;
  }

  /**
   * Mark expired subscriptions
   */
  async markExpiredSubscriptions(): Promise<number> {
    const result = await this.db.subscription.updateMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: { lt: new Date() },
      },
      data: {
        status: SubscriptionStatus.EXPIRED,
      },
    });

    logger.info("Expired subscriptions marked", {
      count: result.count,
    });

    return result.count;
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();
