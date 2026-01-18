/**
 * Notion Webhook Handler
 * Receives and processes webhook events from Notion
 */

import { NextRequest, NextResponse } from "next/server";
import { getNotionConfig } from "@/lib/config/notion";
import { NotionSyncService } from "@/lib/services/notion/notion-sync-service";
import { ConflictResolver } from "@/lib/services/notion/conflict-resolver";
import {
  extractSystemIdFromNotionPage,
  mapNotionPageToUser,
  mapNotionPageToNDISPlan,
  mapNotionPageToCarePlan,
  mapNotionPageToIncident,
  mapNotionPageToComplaint,
  mapNotionPageToRisk,
  mapNotionPageToPayment,
} from "@/lib/services/notion/mappers";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import crypto from "crypto";

const NOTION_API_VERSION = "2022-06-28";

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  if (!secret) {
    logger.warn("No webhook secret configured, skipping signature verification");
    return true; // Allow if no secret configured
  }

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(body);
  const expectedSignature = hmac.digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Get Notion page data
 */
async function getNotionPage(pageId: string, apiKey: string): Promise<any> {
  const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Notion-Version": NOTION_API_VERSION,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Notion page: ${response.status}`);
  }

  return response.json();
}

/**
 * Update system data from Notion
 */
async function updateFromNotion(
  entityType: string,
  systemId: string,
  notionData: any
): Promise<void> {
  const mapping = await prisma.notionSyncMapping.findUnique({
    where: {
      entityType_systemId: {
        entityType,
        systemId,
      },
    },
  });

  if (!mapping) {
    logger.warn("No mapping found for Notion update", { entityType, systemId });
    return;
  }

  // Map Notion data to system model
  let updateData: any = {};
  switch (entityType) {
    case "User":
      updateData = mapNotionPageToUser(notionData);
      if (updateData.name || updateData.email) {
        await prisma.user.update({
          where: { id: systemId },
          data: updateData,
        });
      }
      break;
    case "NDISPlan":
      updateData = mapNotionPageToNDISPlan(notionData);
      if (Object.keys(updateData).length > 0) {
        await prisma.nDISPlan.update({
          where: { id: systemId },
          data: updateData,
        });
      }
      break;
    case "CarePlan":
      updateData = mapNotionPageToCarePlan(notionData);
      if (Object.keys(updateData).length > 0) {
        await prisma.carePlan.update({
          where: { id: systemId },
          data: updateData,
        });
      }
      break;
    case "Incident":
      updateData = mapNotionPageToIncident(notionData);
      if (Object.keys(updateData).length > 0) {
        await prisma.incident.update({
          where: { id: systemId },
          data: updateData,
        });
      }
      break;
    case "Complaint":
      updateData = mapNotionPageToComplaint(notionData);
      if (Object.keys(updateData).length > 0) {
        await prisma.complaint.update({
          where: { id: systemId },
          data: updateData,
        });
      }
      break;
    case "Risk":
      updateData = mapNotionPageToRisk(notionData);
      if (Object.keys(updateData).length > 0) {
        await prisma.risk.update({
          where: { id: systemId },
          data: updateData,
        });
      }
      break;
    case "PaymentTransaction":
      updateData = mapNotionPageToPayment(notionData);
      if (Object.keys(updateData).length > 0) {
        await prisma.paymentTransaction.update({
          where: { id: systemId },
          data: updateData,
        });
      }
      break;
    default:
      logger.warn("Unknown entity type in Notion webhook", { entityType });
      return;
  }

  // Update mapping
  await prisma.notionSyncMapping.update({
    where: {
      entityType_systemId: {
        entityType,
        systemId,
      },
    },
    data: {
      lastSyncedAt: new Date(),
      notionLastEditedAt: new Date(notionData.last_edited_time),
      syncDirection: "both",
    },
  });

  logger.info("Updated system from Notion", { entityType, systemId });
}

/**
 * POST /api/notion/webhook
 * Handle Notion webhook events
 */
export async function POST(request: NextRequest) {
  try {
    const config = getNotionConfig();

    if (!config.enabled) {
      return NextResponse.json({ message: "Notion sync is disabled" }, { status: 200 });
    }

    // Verify webhook signature
    const signature = request.headers.get("x-notion-signature");
    const body = await request.text();

    if (config.webhookSecret && signature) {
      const isValid = verifyWebhookSignature(body, signature, config.webhookSecret);
      if (!isValid) {
        logger.warn("Invalid webhook signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const event = JSON.parse(body);

    // Handle different event types
    if (event.type === "page.updated" || event.type === "page.created") {
      const pageId = event.data?.id || event.object?.id;
      if (!pageId) {
        return NextResponse.json({ error: "Missing page ID" }, { status: 400 });
      }

      // Get full page data
      const page = await getNotionPage(pageId, config.apiKey);
      const systemId = extractSystemIdFromNotionPage(page);

      if (!systemId) {
        logger.warn("No System ID found in Notion page", { pageId });
        return NextResponse.json({ message: "No System ID found" }, { status: 200 });
      }

      // Determine entity type from database ID
      const databaseId = page.parent?.database_id;
      if (!databaseId) {
        logger.warn("No database ID in Notion page", { pageId });
        return NextResponse.json({ message: "No database ID found" }, { status: 200 });
      }

      // Find entity type from database ID
      const mapping = await prisma.notionSyncMapping.findFirst({
        where: {
          notionDatabaseId: databaseId,
          systemId,
        },
      });

      if (!mapping) {
        logger.warn("No mapping found for Notion page", { pageId, databaseId, systemId });
        return NextResponse.json({ message: "No mapping found" }, { status: 200 });
      }

      // Check for conflicts
      const conflictResolver = new ConflictResolver();
      const systemData = await getSystemData(mapping.entityType, systemId);
      
      if (systemData) {
        const conflict: any = {
          systemData,
          notionData: page.properties,
          systemLastModified: systemData.updatedAt || systemData.createdAt,
          notionLastEdited: new Date(page.last_edited_time),
          entityType: mapping.entityType,
          systemId,
        };

        if (conflictResolver.detectConflict(conflict)) {
          const resolution = conflictResolver.resolveConflict(conflict);
          
          if (!resolution.resolved) {
            // Mark for manual review
            await conflictResolver.markConflictPending(
              mapping.entityType,
              systemId,
              conflict
            );
            return NextResponse.json({
              message: "Conflict detected, marked for review",
            });
          }

          // Use resolved data
          if (resolution.data === conflict.notionData) {
            await updateFromNotion(mapping.entityType, systemId, page);
          }
          // If system data wins, no update needed
        } else {
          // No conflict, update from Notion
          await updateFromNotion(mapping.entityType, systemId, page);
        }
      } else {
        // No system data, just update from Notion
        await updateFromNotion(mapping.entityType, systemId, page);
      }

      return NextResponse.json({ message: "Webhook processed" });
    }

    return NextResponse.json({ message: "Event type not handled" });
  } catch (error: any) {
    logger.error("Error processing Notion webhook", { error });
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Get system data for conflict detection
 */
async function getSystemData(entityType: string, systemId: string): Promise<any> {
  switch (entityType) {
    case "User":
      return prisma.user.findUnique({ where: { id: systemId } });
    case "NDISPlan":
      return prisma.nDISPlan.findUnique({ where: { id: systemId } });
    case "CarePlan":
      return prisma.carePlan.findUnique({ where: { id: systemId } });
    case "Incident":
      return prisma.incident.findUnique({ where: { id: systemId } });
    case "Complaint":
      return prisma.complaint.findUnique({ where: { id: systemId } });
    case "Risk":
      return prisma.risk.findUnique({ where: { id: systemId } });
    case "PaymentTransaction":
      return prisma.paymentTransaction.findUnique({ where: { id: systemId } });
    default:
      return null;
  }
}
