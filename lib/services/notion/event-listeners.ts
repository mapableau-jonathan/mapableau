/**
 * Notion Event Listeners
 * Triggers Notion sync when participant-related data changes
 */

import { getNotionConfig } from "../../config/notion";
import { NotionSyncService } from "./notion-sync-service";
import { logger } from "../../logger";

let syncService: NotionSyncService | null = null;

/**
 * Get or create sync service instance
 */
function getSyncService(): NotionSyncService | null {
  try {
    const config = getNotionConfig();
    if (!config.enabled) {
      return null;
    }

    if (!syncService) {
      syncService = new NotionSyncService();
    }
    return syncService;
  } catch (error) {
    logger.warn("Notion sync not configured, skipping", { error });
    return null;
  }
}

/**
 * Trigger sync asynchronously (fire and forget)
 */
async function triggerSync(
  entityType: string,
  entityId: string,
  syncMethod: (id: string) => Promise<void>
): Promise<void> {
  const service = getSyncService();
  if (!service) {
    return;
  }

  // Run in background, don't block
  setImmediate(async () => {
    try {
      await syncMethod.call(service, entityId);
    } catch (error) {
      logger.error(`Error syncing ${entityType} to Notion`, {
        error,
        entityType,
        entityId,
      });
    }
  });
}

/**
 * Listen for User (Participant) changes
 */
export async function onParticipantCreated(userId: string): Promise<void> {
  const user = await import("@/lib/prisma").then((m) => m.prisma.user.findUnique({
    where: { id: userId },
  }));

  if (user && user.role === "PARTICIPANT") {
    triggerSync("User", userId, (id) => getSyncService()!.syncParticipantToNotion(id));
  }
}

export async function onParticipantUpdated(userId: string): Promise<void> {
  const user = await import("@/lib/prisma").then((m) => m.prisma.user.findUnique({
    where: { id: userId },
  }));

  if (user && user.role === "PARTICIPANT") {
    triggerSync("User", userId, (id) => getSyncService()!.syncParticipantToNotion(id));
  }
}

/**
 * Listen for NDIS Plan changes
 */
export async function onNDISPlanCreated(planId: string): Promise<void> {
  triggerSync("NDISPlan", planId, (id) => getSyncService()!.syncNDISPlanToNotion(id));
}

export async function onNDISPlanUpdated(planId: string): Promise<void> {
  triggerSync("NDISPlan", planId, (id) => getSyncService()!.syncNDISPlanToNotion(id));
}

/**
 * Listen for Care Plan changes
 */
export async function onCarePlanCreated(planId: string): Promise<void> {
  triggerSync("CarePlan", planId, (id) => getSyncService()!.syncCarePlanToNotion(id));
}

export async function onCarePlanUpdated(planId: string): Promise<void> {
  triggerSync("CarePlan", planId, (id) => getSyncService()!.syncCarePlanToNotion(id));
}

/**
 * Listen for Incident changes
 */
export async function onIncidentCreated(incidentId: string): Promise<void> {
  triggerSync("Incident", incidentId, (id) => getSyncService()!.syncIncidentToNotion(id));
}

export async function onIncidentUpdated(incidentId: string): Promise<void> {
  triggerSync("Incident", incidentId, (id) => getSyncService()!.syncIncidentToNotion(id));
}

/**
 * Listen for Complaint changes
 */
export async function onComplaintCreated(complaintId: string): Promise<void> {
  triggerSync("Complaint", complaintId, (id) => getSyncService()!.syncComplaintToNotion(id));
}

export async function onComplaintUpdated(complaintId: string): Promise<void> {
  triggerSync("Complaint", complaintId, (id) => getSyncService()!.syncComplaintToNotion(id));
}

/**
 * Listen for Risk changes
 */
export async function onRiskCreated(riskId: string): Promise<void> {
  triggerSync("Risk", riskId, (id) => getSyncService()!.syncRiskToNotion(id));
}

export async function onRiskUpdated(riskId: string): Promise<void> {
  triggerSync("Risk", riskId, (id) => getSyncService()!.syncRiskToNotion(id));
}

/**
 * Listen for Payment Transaction changes
 */
export async function onPaymentCreated(paymentId: string): Promise<void> {
  triggerSync("PaymentTransaction", paymentId, (id) => getSyncService()!.syncPaymentToNotion(id));
}

export async function onPaymentUpdated(paymentId: string): Promise<void> {
  triggerSync("PaymentTransaction", paymentId, (id) => getSyncService()!.syncPaymentToNotion(id));
}
