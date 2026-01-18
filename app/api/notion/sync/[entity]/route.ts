/**
 * Manual Notion Sync Endpoint - Generic Entity
 * POST /api/notion/sync/[entity]?id=...
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NotionSyncService } from "@/lib/services/notion/notion-sync-service";
import { getNotionConfig } from "@/lib/config/notion";
import { logger } from "@/lib/logger";

const ENTITY_SYNC_METHODS: Record<string, (service: NotionSyncService, id: string) => Promise<void>> = {
  participant: (service, id) => service.syncParticipantToNotion(id),
  ndisplan: (service, id) => service.syncNDISPlanToNotion(id),
  careplan: (service, id) => service.syncCarePlanToNotion(id),
  incident: (service, id) => service.syncIncidentToNotion(id),
  complaint: (service, id) => service.syncComplaintToNotion(id),
  risk: (service, id) => service.syncRiskToNotion(id),
  payment: (service, id) => service.syncPaymentToNotion(id),
};

/**
 * POST /api/notion/sync/[entity]
 * Manually sync a specific entity to Notion
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { entity: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = getNotionConfig();
    if (!config.enabled) {
      return NextResponse.json(
        { error: "Notion sync is disabled" },
        { status: 400 }
      );
    }

    const entity = params.entity.toLowerCase();
    const syncMethod = ENTITY_SYNC_METHODS[entity];

    if (!syncMethod) {
      return NextResponse.json(
        { error: `Unknown entity type: ${entity}` },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing id parameter" },
        { status: 400 }
      );
    }

    const syncService = new NotionSyncService();
    await syncMethod(syncService, id);

    return NextResponse.json({
      message: `Synced ${entity} to Notion`,
      entity,
      id,
    });
  } catch (error: any) {
    logger.error("Error in manual entity sync", { error, entity: params.entity });
    return NextResponse.json(
      { error: error.message || "Sync failed" },
      { status: 500 }
    );
  }
}
