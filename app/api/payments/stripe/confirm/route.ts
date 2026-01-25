/**
 * Confirm Stripe Payment Endpoint
 * POST /api/payments/stripe/confirm
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { unifiedPaymentService } from "@/lib/services/payments/unified-payment-service";
import { logger } from "@/lib/logger";

/**
 * POST /api/payments/stripe/confirm
 * Confirm Stripe payment intent
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { paymentIntentId, paymentMethodId } = body;

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: "Payment intent ID is required" },
        { status: 400 }
      );
    }

    // Confirm payment
    const result = await unifiedPaymentService.confirmPayment(
      "stripe",
      paymentIntentId,
      paymentMethodId
    );

    return NextResponse.json(result);
  } catch (error: any) {
    logger.error("Error confirming Stripe payment", { error });
    return NextResponse.json(
      { error: error.message || "Failed to confirm payment" },
      { status: 500 }
    );
  }
}
