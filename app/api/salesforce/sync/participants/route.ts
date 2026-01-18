/**
 * Manual Salesforce Sync Endpoint - Participants
 * POST /api/salesforce/sync/participants
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { SalesforceSyncService } from "@/lib/services/salesforce/salesforce-sync-service";
import { getSalesforceConfig } from "@/lib/config/salesforce";
import { logger } from "@/lib/logger";

/**
 * POST /api/salesforce/sync/participants
 * Manually sync all participants to Salesforce
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = getSalesforceConfig();
    if (!config.enabled) {
      return NextResponse.json(
        { error: "Salesforce sync is disabled" },
        { status: 400 }
      );
    }

    const syncService = new SalesforceSyncService();
    const result = await syncService.syncAllParticipants(session.user.id);

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
