/**
 * Manual Salesforce Sync Endpoint - Entity
 * POST /api/salesforce/sync/[entity]
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { SalesforceSyncService } from "@/lib/services/salesforce/salesforce-sync-service";
import { getSalesforceConfig } from "@/lib/config/salesforce";
import { logger } from "@/lib/logger";

const ENTITY_MAP: Record<string, keyof SalesforceSyncService> = {
  participant: "syncParticipantToSalesforce",
  "ndis-plan": "syncNDISPlanToSalesforce",
  "care-plan": "syncCarePlanToSalesforce",
  incident: "syncIncidentToSalesforce",
  complaint: "syncComplaintToSalesforce",
  risk: "syncRiskToSalesforce",
  payment: "syncPaymentToSalesforce",
};

/**
 * POST /api/salesforce/sync/[entity]
 * Manually sync a specific entity to Salesforce
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { entity } = await params;
    const config = getSalesforceConfig();

    if (!config.enabled) {
      return NextResponse.json(
        { error: "Salesforce sync is disabled" },
        { status: 400 }
      );
    }

    const syncMethod = ENTITY_MAP[entity];
    if (!syncMethod) {
      return NextResponse.json(
        { error: `Invalid entity type: ${entity}` },
        { status: 400 }
      );
    }

    // Get entity ID from request body
    const body = await request.json().catch(() => ({}));
    const entityId = body.id || body.entityId;

    if (!entityId) {
      return NextResponse.json(
        { error: "Entity ID is required" },
        { status: 400 }
      );
    }

    const syncService = new SalesforceSyncService();
    
    // Call the appropriate sync method
    await (syncService[syncMethod] as (id: string, userId?: string) => Promise<void>)(
      entityId,
      session.user.id
    );

    return NextResponse.json({
      message: `Successfully synced ${entity}`,
      entityId,
    });
  } catch (error: any) {
    logger.error("Error in entity sync", { error, entity: (await params).entity });
    return NextResponse.json(
      { error: error.message || "Sync failed" },
      { status: 500 }
    );
  }
}
