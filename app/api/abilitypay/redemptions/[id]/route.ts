/**
 * Redemption Details API
 * GET /api/abilitypay/redemptions/[id] - Get redemption status
 * POST /api/abilitypay/redemptions/[id]/process - Process redemption (admin)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { RedemptionService } from "@/lib/services/abilitypay";
import { NPPAdapter } from "@/lib/services/abilitypay/banking";
import { requireAdmin, requireAuth } from "@/lib/security/authorization-utils";
import { logger } from "@/lib/logger";

const nppAdapter = new NPPAdapter({
  apiUrl: process.env.NPP_API_URL,
  apiKey: process.env.NPP_API_KEY,
  merchantId: process.env.NPP_MERCHANT_ID,
});

const redemptionService = new RedemptionService(nppAdapter);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const redemption = await redemptionService.getRedemptionStatus(params.id);
    return NextResponse.json(redemption);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get redemption status" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // SECURITY: Require admin role to process redemptions
    await requireAdmin();

    const redemption = await redemptionService.processRedemption(params.id);
    return NextResponse.json(redemption);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }
    logger.error("Error processing redemption", error);
    return NextResponse.json(
      { error: "Failed to process redemption" },
      { status: 500 }
    );
  }
}
