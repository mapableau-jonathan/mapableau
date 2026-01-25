/**
 * Create Stripe Payment Intent Endpoint
 * POST /api/payments/stripe/create-intent
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { unifiedPaymentService } from "@/lib/services/payments/unified-payment-service";
import { validatePaymentRequest } from "@/lib/utils/payments/validation";
import { logger } from "@/lib/logger";

/**
 * POST /api/payments/stripe/create-intent
 * Create Stripe Payment Intent
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { amount, currency, description, invoiceId, paymentMethodId, metadata } = body;

    // Validate request
    const validation = validatePaymentRequest({
      amount,
      currency: currency || "AUD",
      provider: "stripe",
      userId: session.user.id,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: "Validation failed", errors: validation.errors },
        { status: 400 }
      );
    }

    // Process payment
    const paymentResult = await unifiedPaymentService.processPayment(
      {
        amount,
        currency: currency || "AUD",
        description: description || "Payment",
        invoiceId,
        userId: session.user.id,
        paymentMethodId,
        metadata,
      },
      "stripe"
    );

    return NextResponse.json(paymentResult);
  } catch (error: any) {
    logger.error("Error creating Stripe payment intent", { error });
    return NextResponse.json(
      { error: error.message || "Failed to create payment intent" },
      { status: 500 }
    );
  }
}
