/**
 * MapAble Core - Service Link Service
 * Manages user access to different MapAble services
 */

import { PrismaClient, ServiceLink, ServiceType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export interface CreateServiceLinkInput {
  userId: string;
  serviceType: ServiceType;
  preferences?: Record<string, unknown>;
}

export interface UpdateServiceLinkInput {
  isActive?: boolean;
  preferences?: Record<string, unknown>;
}

export class ServiceLinkService {
  private db: PrismaClient;

  constructor(db: PrismaClient = prisma) {
    this.db = db;
  }

  /**
   * Link a user to a service
   */
  async linkService(input: CreateServiceLinkInput): Promise<ServiceLink> {
    try {
      // Check if link already exists
      const existing = await this.db.serviceLink.findUnique({
        where: {
          userId_serviceType: {
            userId: input.userId,
            serviceType: input.serviceType,
          },
        },
      });

      if (existing) {
        // Update existing link
        return this.updateServiceLink(existing.id, {
          isActive: true,
          preferences: input.preferences,
        });
      }

      const serviceLink = await this.db.serviceLink.create({
        data: {
          userId: input.userId,
          serviceType: input.serviceType,
          isActive: true,
          preferences: input.preferences as Prisma.JsonObject,
        },
      });

      logger.info("Service linked", {
        serviceLinkId: serviceLink.id,
        userId: input.userId,
        serviceType: input.serviceType,
      });

      return serviceLink;
    } catch (error) {
      logger.error("Failed to link service", error);
      throw error;
    }
  }

  /**
   * Get service link
   */
  async getServiceLink(
    userId: string,
    serviceType: ServiceType
  ): Promise<ServiceLink | null> {
    return this.db.serviceLink.findUnique({
      where: {
        userId_serviceType: {
          userId,
          serviceType,
        },
      },
    });
  }

  /**
   * Get all service links for a user
   */
  async getUserServiceLinks(
    userId: string,
    activeOnly?: boolean
  ): Promise<ServiceLink[]> {
    return this.db.serviceLink.findMany({
      where: {
        userId,
        ...(activeOnly && { isActive: true }),
      },
      orderBy: { linkedAt: "desc" },
    });
  }

  /**
   * Update service link
   */
  async updateServiceLink(
    serviceLinkId: string,
    input: UpdateServiceLinkInput
  ): Promise<ServiceLink> {
    try {
      const serviceLink = await this.db.serviceLink.update({
        where: { id: serviceLinkId },
        data: {
          ...(input.isActive !== undefined && { isActive: input.isActive }),
          ...(input.preferences && {
            preferences: input.preferences as Prisma.JsonValue,
          }),
          ...(input.isActive && { lastAccessed: new Date() }),
        },
      });

      logger.info("Service link updated", {
        serviceLinkId,
        updates: input,
      });

      return serviceLink;
    } catch (error) {
      logger.error("Failed to update service link", error);
      throw error;
    }
  }

  /**
   * Unlink a service (deactivate)
   */
  async unlinkService(
    userId: string,
    serviceType: ServiceType
  ): Promise<ServiceLink> {
    const serviceLink = await this.getServiceLink(userId, serviceType);
    if (!serviceLink) {
      throw new Error("Service link not found");
    }

    return this.updateServiceLink(serviceLink.id, {
      isActive: false,
    });
  }

  /**
   * Check if user has access to a service
   */
  async hasServiceAccess(
    userId: string,
    serviceType: ServiceType
  ): Promise<boolean> {
    const serviceLink = await this.getServiceLink(userId, serviceType);
    return serviceLink?.isActive ?? false;
  }

  /**
   * Update last accessed timestamp
   */
  async updateLastAccessed(
    userId: string,
    serviceType: ServiceType
  ): Promise<void> {
    const serviceLink = await this.getServiceLink(userId, serviceType);
    if (serviceLink) {
      await this.db.serviceLink.update({
        where: { id: serviceLink.id },
        data: { lastAccessed: new Date() },
      });
    }
  }
}

// Export singleton instance
export const serviceLinkService = new ServiceLinkService();
