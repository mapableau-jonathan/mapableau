/**
 * Manual Notion Sync Endpoint - Participants
 * POST /api/notion/sync/participants
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NotionSyncService } from "@/lib/services/notion/notion-sync-service";
import { getNotionConfig } from "@/lib/config/notion";
import { logger } from "@/lib/logger";

/**
 * POST /api/notion/sync/participants
 * Manually sync all participants to Notion
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin rights (optional - adjust based on your auth system)
    // For now, allow any authenticated user

    const config = getNotionConfig();
    if (!config.enabled) {
      return NextResponse.json(
        { error: "Notion sync is disabled" },
        { status: 400 }
      );
    }

    const syncService = new NotionSyncService();
    const result = await syncService.syncAllParticipants();

    return NextResponse.json({
      message: "Sync completed",
      synced: result.synced,
      failed: result.failed,
    });
  } catch (error: any) {
    logger.error("Error in manual participant sync", { error });
    return NextResponse.json(
      { error: error.message || "Sync failed" },
      { status: 500 }
    );
  }
}
