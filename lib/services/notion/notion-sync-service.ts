/**
 * Notion Sync Service
 * Handles syncing participant-related data to Notion databases
 */

import { prisma } from "@/lib/prisma";
import { getNotionConfig, getDatabaseId, validateNotionConfig } from "../../config/notion";
import {
  mapUserToNotionProperties,
  mapNDISPlanToNotionProperties,
  mapCarePlanToNotionProperties,
  mapIncidentToNotionProperties,
  mapComplaintToNotionProperties,
  mapRiskToNotionProperties,
  mapPaymentToNotionProperties,
  extractSystemIdFromNotionPage,
} from "./mappers";
import { logger } from "../../logger";

const NOTION_API_VERSION = "2022-06-28";

interface NotionPage {
  id: string;
  properties: Record<string, any>;
  last_edited_time: string;
}

interface NotionDatabaseQuery {
  filter?: {
    property: string;
    rich_text: {
      equals: string;
    };
  };
}

/**
 * Notion Sync Service
 */
export class NotionSyncService {
  private config = getNotionConfig();
  private apiKey: string;

  constructor() {
    validateNotionConfig(this.config);
    this.apiKey = this.config.apiKey;
  }

  /**
   * Make authenticated request to Notion API
   */
  private async notionRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = endpoint.startsWith("https://") ? endpoint : `https://api.notion.com/v1${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Notion-Version": NOTION_API_VERSION,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Notion API error: ${response.status} ${error}`);
    }

    return response;
  }

  /**
   * Find Notion page by System ID
   */
  async findNotionPageBySystemId(
    databaseId: string,
    systemId: string
  ): Promise<NotionPage | null> {
    try {
      const response = await this.notionRequest(`/databases/${databaseId}/query`, {
        method: "POST",
        body: JSON.stringify({
          filter: {
            property: "System ID",
            rich_text: {
              equals: systemId,
            },
          },
        }),
      });

      const data = await response.json();
      return data.results && data.results.length > 0 ? data.results[0] : null;
    } catch (error) {
      logger.error("Error finding Notion page", { error, databaseId, systemId });
      return null;
    }
  }

  /**
   * Create Notion page
   */
  async createNotionPage(databaseId: string, properties: Record<string, any>): Promise<NotionPage> {
    const response = await this.notionRequest("/pages", {
      method: "POST",
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties,
      }),
    });

    return response.json();
  }

  /**
   * Update Notion page
   */
  async updateNotionPage(pageId: string, properties: Record<string, any>): Promise<NotionPage> {
    const response = await this.notionRequest(`/pages/${pageId}`, {
      method: "PATCH",
      body: JSON.stringify({ properties }),
    });

    return response.json();
  }

  /**
   * Store sync mapping
   */
  private async storeMapping(
    entityType: string,
    systemId: string,
    notionPageId: string,
    notionDatabaseId: string,
    syncDirection: "to_notion" | "from_notion" | "both" = "to_notion"
  ): Promise<void> {
    await prisma.notionSyncMapping.upsert({
      where: {
        entityType_systemId: {
          entityType,
          systemId,
        },
      },
      update: {
        notionPageId,
        notionDatabaseId,
        lastSyncedAt: new Date(),
        syncDirection,
      },
      create: {
        entityType,
        systemId,
        notionPageId,
        notionDatabaseId,
        lastSyncedAt: new Date(),
        syncDirection,
      },
    });
  }

  /**
   * Resolve relation IDs (convert system IDs to Notion page IDs)
   */
  private async resolveRelationIds(
    properties: Record<string, any>,
    entityType: string
  ): Promise<Record<string, any>> {
    const resolved = { ...properties };

    // Find relation properties and resolve them
    for (const [key, value] of Object.entries(properties)) {
      if (value && typeof value === "object" && "relation" in value && Array.isArray(value.relation)) {
        const relationIds = value.relation.map((r: { id: string }) => r.id);
        const resolvedIds: string[] = [];

        for (const systemId of relationIds) {
          // Find the Notion page ID for this system ID
          const mapping = await prisma.notionSyncMapping.findUnique({
            where: {
              entityType_systemId: {
                entityType,
                systemId,
              },
            },
          });

          if (mapping) {
            resolvedIds.push({ id: mapping.notionPageId });
          }
        }

        resolved[key] = { relation: resolvedIds };
      }
    }

    return resolved;
  }

  /**
   * Sync participant (User) to Notion
   */
  async syncParticipantToNotion(participantId: string): Promise<void> {
    if (!this.config.syncSettings.syncParticipants) {
      return;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: participantId },
        include: {
          ndisPlan: true,
        },
      });

      if (!user || user.role !== "PARTICIPANT") {
        logger.warn("User not found or not a participant", { participantId });
        return;
      }

      const databaseId = getDatabaseId("User");
      const properties = mapUserToNotionProperties(user);
      const resolvedProperties = await this.resolveRelationIds(properties, "NDISPlan");

      // Find existing page
      const existingPage = await this.findNotionPageBySystemId(databaseId, participantId);

      let page: NotionPage;
      if (existingPage) {
        page = await this.updateNotionPage(existingPage.id, resolvedProperties);
      } else {
        page = await this.createNotionPage(databaseId, resolvedProperties);
      }

      await this.storeMapping("User", participantId, page.id, databaseId, "both");
      logger.info("Synced participant to Notion", { participantId, notionPageId: page.id });
    } catch (error) {
      logger.error("Error syncing participant to Notion", { error, participantId });
      throw error;
    }
  }

  /**
   * Sync NDIS Plan to Notion
   */
  async syncNDISPlanToNotion(planId: string): Promise<void> {
    if (!this.config.syncSettings.syncNDISPlans) {
      return;
    }

    try {
      const plan = await prisma.nDISPlan.findUnique({
        where: { id: planId },
        include: {
          participant: true,
          planManager: true,
        },
      });

      if (!plan) {
        logger.warn("NDIS Plan not found", { planId });
        return;
      }

      const databaseId = getDatabaseId("NDISPlan");
      const properties = mapNDISPlanToNotionProperties(plan);
      const resolvedProperties = await this.resolveRelationIds(properties, "User");

      const existingPage = await this.findNotionPageBySystemId(databaseId, planId);

      let page: NotionPage;
      if (existingPage) {
        page = await this.updateNotionPage(existingPage.id, resolvedProperties);
      } else {
        page = await this.createNotionPage(databaseId, resolvedProperties);
      }

      await this.storeMapping("NDISPlan", planId, page.id, databaseId, "both");
      logger.info("Synced NDIS plan to Notion", { planId, notionPageId: page.id });
    } catch (error) {
      logger.error("Error syncing NDIS plan to Notion", { error, planId });
      throw error;
    }
  }

  /**
   * Sync Care Plan to Notion
   */
  async syncCarePlanToNotion(planId: string): Promise<void> {
    if (!this.config.syncSettings.syncCarePlans) {
      return;
    }

    try {
      const plan = await prisma.carePlan.findUnique({
        where: { id: planId },
        include: {
          participant: true,
          worker: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!plan) {
        logger.warn("Care Plan not found", { planId });
        return;
      }

      const databaseId = getDatabaseId("CarePlan");
      const properties = mapCarePlanToNotionProperties(plan);
      const resolvedProperties = await this.resolveRelationIds(properties, "User");

      const existingPage = await this.findNotionPageBySystemId(databaseId, planId);

      let page: NotionPage;
      if (existingPage) {
        page = await this.updateNotionPage(existingPage.id, resolvedProperties);
      } else {
        page = await this.createNotionPage(databaseId, resolvedProperties);
      }

      await this.storeMapping("CarePlan", planId, page.id, databaseId, "both");
      logger.info("Synced care plan to Notion", { planId, notionPageId: page.id });
    } catch (error) {
      logger.error("Error syncing care plan to Notion", { error, planId });
      throw error;
    }
  }

  /**
   * Sync Incident to Notion
   */
  async syncIncidentToNotion(incidentId: string): Promise<void> {
    if (!this.config.syncSettings.syncIncidents) {
      return;
    }

    try {
      const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
        include: {
          participant: true,
        },
      });

      if (!incident) {
        logger.warn("Incident not found", { incidentId });
        return;
      }

      const databaseId = getDatabaseId("Incident");
      const properties = mapIncidentToNotionProperties(incident);
      const resolvedProperties = await this.resolveRelationIds(properties, "User");

      const existingPage = await this.findNotionPageBySystemId(databaseId, incidentId);

      let page: NotionPage;
      if (existingPage) {
        page = await this.updateNotionPage(existingPage.id, resolvedProperties);
      } else {
        page = await this.createNotionPage(databaseId, resolvedProperties);
      }

      await this.storeMapping("Incident", incidentId, page.id, databaseId, "both");
      logger.info("Synced incident to Notion", { incidentId, notionPageId: page.id });
    } catch (error) {
      logger.error("Error syncing incident to Notion", { error, incidentId });
      throw error;
    }
  }

  /**
   * Sync Complaint to Notion
   */
  async syncComplaintToNotion(complaintId: string): Promise<void> {
    if (!this.config.syncSettings.syncComplaints) {
      return;
    }

    try {
      const complaint = await prisma.complaint.findUnique({
        where: { id: complaintId },
        include: {
          participant: true,
        },
      });

      if (!complaint) {
        logger.warn("Complaint not found", { complaintId });
        return;
      }

      const databaseId = getDatabaseId("Complaint");
      const properties = mapComplaintToNotionProperties(complaint);
      const resolvedProperties = await this.resolveRelationIds(properties, "User");

      const existingPage = await this.findNotionPageBySystemId(databaseId, complaintId);

      let page: NotionPage;
      if (existingPage) {
        page = await this.updateNotionPage(existingPage.id, resolvedProperties);
      } else {
        page = await this.createNotionPage(databaseId, resolvedProperties);
      }

      await this.storeMapping("Complaint", complaintId, page.id, databaseId, "both");
      logger.info("Synced complaint to Notion", { complaintId, notionPageId: page.id });
    } catch (error) {
      logger.error("Error syncing complaint to Notion", { error, complaintId });
      throw error;
    }
  }

  /**
   * Sync Risk to Notion
   */
  async syncRiskToNotion(riskId: string): Promise<void> {
    if (!this.config.syncSettings.syncRisks) {
      return;
    }

    try {
      const risk = await prisma.risk.findUnique({
        where: { id: riskId },
        include: {
          participant: true,
        },
      });

      if (!risk) {
        logger.warn("Risk not found", { riskId });
        return;
      }

      const databaseId = getDatabaseId("Risk");
      const properties = mapRiskToNotionProperties(risk);
      const resolvedProperties = await this.resolveRelationIds(properties, "User");

      const existingPage = await this.findNotionPageBySystemId(databaseId, riskId);

      let page: NotionPage;
      if (existingPage) {
        page = await this.updateNotionPage(existingPage.id, resolvedProperties);
      } else {
        page = await this.createNotionPage(databaseId, resolvedProperties);
      }

      await this.storeMapping("Risk", riskId, page.id, databaseId, "both");
      logger.info("Synced risk to Notion", { riskId, notionPageId: page.id });
    } catch (error) {
      logger.error("Error syncing risk to Notion", { error, riskId });
      throw error;
    }
  }

  /**
   * Sync Payment Transaction to Notion
   */
  async syncPaymentToNotion(paymentId: string): Promise<void> {
    if (!this.config.syncSettings.syncPayments) {
      return;
    }

    try {
      const payment = await prisma.paymentTransaction.findUnique({
        where: { id: paymentId },
        include: {
          participant: true,
          provider: true,
        },
      });

      if (!payment) {
        logger.warn("Payment transaction not found", { paymentId });
        return;
      }

      const databaseId = getDatabaseId("PaymentTransaction");
      const properties = mapPaymentToNotionProperties(payment);
      const resolvedProperties = await this.resolveRelationIds(properties, "User");

      const existingPage = await this.findNotionPageBySystemId(databaseId, paymentId);

      let page: NotionPage;
      if (existingPage) {
        page = await this.updateNotionPage(existingPage.id, resolvedProperties);
      } else {
        page = await this.createNotionPage(databaseId, resolvedProperties);
      }

      await this.storeMapping("PaymentTransaction", paymentId, page.id, databaseId, "both");
      logger.info("Synced payment to Notion", { paymentId, notionPageId: page.id });
    } catch (error) {
      logger.error("Error syncing payment to Notion", { error, paymentId });
      throw error;
    }
  }

  /**
   * Sync all participants (batch operation)
   */
  async syncAllParticipants(): Promise<{ synced: number; failed: number }> {
    let synced = 0;
    let failed = 0;

    try {
      const participants = await prisma.user.findMany({
        where: { role: "PARTICIPANT" },
      });

      for (const participant of participants) {
        try {
          await this.syncParticipantToNotion(participant.id);
          synced++;
        } catch (error) {
          logger.error("Failed to sync participant", { error, participantId: participant.id });
          failed++;
        }
      }

      logger.info("Batch sync completed", { synced, failed, total: participants.length });
    } catch (error) {
      logger.error("Error in batch sync", { error });
      throw error;
    }

    return { synced, failed };
  }
}
