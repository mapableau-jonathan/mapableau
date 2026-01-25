/**
 * NDIS myplace Payments Endpoint
 * GET /api/ndis/myplace/payments
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NDISMyplaceApiService } from "@/lib/services/ndis/myplace-api-service";
import { getNDISMyplaceConfig } from "@/lib/config/ndis-myplace";
import { logger } from "@/lib/logger";

/**
 * GET /api/ndis/myplace/payments
 * Get payment history
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = getNDISMyplaceConfig();
    if (!config.enabled) {
      return NextResponse.json(
        { error: "NDIS myplace integration is disabled" },
        { status: 400 }
      );
    }

    const apiService = new NDISMyplaceApiService();

    const fromDate = request.nextUrl.searchParams.get("fromDate") || undefined;
    const toDate = request.nextUrl.searchParams.get("toDate") || undefined;
    const status = request.nextUrl.searchParams.get("status") || undefined;

    const payments = await apiService.getPayments(session.user.id, {
      fromDate,
      toDate,
      status,
    });

    return NextResponse.json({ payments });
  } catch (error: any) {
    logger.error("Error fetching payments from myplace", { error });
    return NextResponse.json(
      { error: error.message || "Failed to fetch payments" },
      { status: 500 }
    );
  }
}
