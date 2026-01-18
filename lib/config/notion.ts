/**
 * Notion Configuration
 * Manages Notion API credentials and database IDs for participant CRM sync
 */

import { getEnv } from "./env";

export type ConflictResolutionStrategy = "last-write-wins" | "timestamp-based" | "manual-review";

export interface NotionConfig {
  apiKey: string;
  webhookSecret?: string;
  enabled: boolean;
  conflictStrategy: ConflictResolutionStrategy;
  databases: {
    participants?: string;
    ndisPlans?: string;
    carePlans?: string;
    incidents?: string;
    complaints?: string;
    risks?: string;
    payments?: string;
  };
  syncSettings: {
    syncParticipants: boolean;
    syncNDISPlans: boolean;
    syncCarePlans: boolean;
    syncIncidents: boolean;
    syncComplaints: boolean;
    syncRisks: boolean;
    syncPayments: boolean;
  };
}

/**
 * Get Notion configuration from environment variables
 */
export function getNotionConfig(): NotionConfig {
  const env = getEnv();
  
  const apiKey = env.NOTION_API_KEY;
  if (!apiKey) {
    throw new Error("NOTION_API_KEY is required for Notion sync");
  }

  return {
    apiKey,
    webhookSecret: env.NOTION_WEBHOOK_SECRET,
    enabled: env.NOTION_SYNC_ENABLED === "true" || env.NOTION_SYNC_ENABLED === "1",
    conflictStrategy: (env.NOTION_CONFLICT_STRATEGY as ConflictResolutionStrategy) || "last-write-wins",
    databases: {
      participants: env.NOTION_PARTICIPANTS_DB_ID,
      ndisPlans: env.NOTION_NDIS_PLANS_DB_ID,
      carePlans: env.NOTION_CARE_PLANS_DB_ID,
      incidents: env.NOTION_INCIDENTS_DB_ID,
      complaints: env.NOTION_COMPLAINTS_DB_ID,
      risks: env.NOTION_RISKS_DB_ID,
      payments: env.NOTION_PAYMENTS_DB_ID,
    },
    syncSettings: {
      syncParticipants: env.NOTION_SYNC_PARTICIPANTS !== "false",
      syncNDISPlans: env.NOTION_SYNC_NDIS_PLANS !== "false",
      syncCarePlans: env.NOTION_SYNC_CARE_PLANS !== "false",
      syncIncidents: env.NOTION_SYNC_INCIDENTS !== "false",
      syncComplaints: env.NOTION_SYNC_COMPLAINTS !== "false",
      syncRisks: env.NOTION_SYNC_RISKS !== "false",
      syncPayments: env.NOTION_SYNC_PAYMENTS !== "false",
    },
  };
}

/**
 * Validate that required database IDs are configured
 */
export function validateNotionConfig(config: NotionConfig): void {
  if (!config.enabled) {
    return; // Skip validation if sync is disabled
  }

  const required = [
    { key: "participants", id: config.databases.participants },
    { key: "ndisPlans", id: config.databases.ndisPlans },
    { key: "carePlans", id: config.databases.carePlans },
    { key: "incidents", id: config.databases.incidents },
    { key: "complaints", id: config.databases.complaints },
    { key: "risks", id: config.databases.risks },
    { key: "payments", id: config.databases.payments },
  ];

  const missing = required
    .filter(({ key, id }) => {
      // Check if sync is enabled for this entity type
      const syncKey = `sync${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof NotionConfig["syncSettings"];
      const syncEnabled = config.syncSettings[syncKey];
      return syncEnabled && !id;
    })
    .map(({ key }) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing Notion database IDs for: ${missing.join(", ")}. ` +
      `Set NOTION_${missing.map((k) => k.toUpperCase()).join("_DB_ID, NOTION_")}_DB_ID environment variables.`
    );
  }
}

/**
 * Get database ID for a specific entity type
 */
export function getDatabaseId(entityType: string): string {
  const config = getNotionConfig();
  const dbMap: Record<string, string | undefined> = {
    User: config.databases.participants,
    NDISPlan: config.databases.ndisPlans,
    CarePlan: config.databases.carePlans,
    Incident: config.databases.incidents,
    Complaint: config.databases.complaints,
    Risk: config.databases.risks,
    PaymentTransaction: config.databases.payments,
  };

  const dbId = dbMap[entityType];
  if (!dbId) {
    throw new Error(`No Notion database ID configured for entity type: ${entityType}`);
  }

  return dbId;
}
