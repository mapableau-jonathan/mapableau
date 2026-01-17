/**
 * MapAble Core - Billing API
 * GET /api/core/billing/summary - Get billing summary for user
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next/auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { billingService } from "@/lib/services/core";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const summary = await billingService.getBillingSummary(session.user.id);

    return NextResponse.json({ summary });
  } catch (error) {
    logger.error("Failed to get billing summary", error);
    return NextResponse.json(
      { error: "Failed to get billing summary" },
      { status: 500 }
    );
  }
}
