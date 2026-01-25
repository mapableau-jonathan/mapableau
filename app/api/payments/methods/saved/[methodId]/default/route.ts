/**
 * Set Default Payment Method Endpoint
 * POST /api/payments/methods/saved/[methodId]/default
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { unifiedPaymentService } from "@/lib/services/payments/unified-payment-service";
import { logger } from "@/lib/logger";

/**
 * POST /api/payments/methods/saved/[methodId]/default
 * Set payment method as default
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ methodId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { methodId } = await params;

    await unifiedPaymentService.setDefaultPaymentMethod(methodId, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error("Error setting default payment method", { error });
    return NextResponse.json(
      { error: error.message || "Failed to set default payment method" },
      { status: 500 }
    );
  }
}
