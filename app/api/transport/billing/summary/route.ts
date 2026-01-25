/**
 * Transport Billing Summary Endpoint
 * GET /api/transport/billing/summary
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { transportBillingService } from "@/lib/services/transport/transport-billing-service";
import { requireAdmin } from "@/lib/security/authorization-utils";
import { logger } from "@/lib/logger";

/**
 * GET /api/transport/billing/summary
 * Get transport billing summary (participant's own or admin view)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const participantId = request.nextUrl.searchParams.get("participantId") || session.user.id;
    const startDate = request.nextUrl.searchParams.get("startDate")
      ? new Date(request.nextUrl.searchParams.get("startDate")!)
      : undefined;
    const endDate = request.nextUrl.searchParams.get("endDate")
      ? new Date(request.nextUrl.searchParams.get("endDate")!)
      : undefined;

    // Non-admins can only view their own summary
    if (participantId !== session.user.id && session.user.role !== "NDIA_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Cannot view other participants' billing" },
        { status: 403 }
      );
    }

    const summary = await transportBillingService.getTransportBillingSummary(
      participantId,
      startDate,
      endDate
    );

    // Remove cost details for non-admins viewing own data
    if (session.user.role !== "NDIA_ADMIN") {
      return NextResponse.json({
        totalBookings: summary.totalBookings,
        completedBookings: summary.completedBookings,
        // Costs hidden from non-admins
      });
    }

    return NextResponse.json(summary);
  } catch (error: any) {
    logger.error("Error getting transport billing summary", { error });
    return NextResponse.json(
      { error: error.message || "Failed to get billing summary" },
      { status: 500 }
    );
  }
}
