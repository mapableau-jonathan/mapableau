/**
 * Create PayPal Order Endpoint
 * POST /api/payments/paypal/create-order
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { unifiedPaymentService } from "@/lib/services/payments/unified-payment-service";
import { validatePaymentRequest } from "@/lib/utils/payments/validation";
import { logger } from "@/lib/logger";

/**
 * POST /api/payments/paypal/create-order
 * Create PayPal order
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { amount, currency, description, invoiceId, returnUrl, cancelUrl, metadata } = body;

    // Validate request
    const validation = validatePaymentRequest({
      amount,
      currency: currency || "AUD",
      provider: "paypal",
      userId: session.user.id,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: "Validation failed", errors: validation.errors },
        { status: 400 }
      );
    }

    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.AD_ID_DOMAIN ||
      "http://localhost:3000";

    // Process payment
    const paymentResult = await unifiedPaymentService.processPayment(
      {
        amount,
        currency: currency || "AUD",
        description: description || "Payment",
        invoiceId,
        userId: session.user.id,
        returnUrl: returnUrl || `${baseUrl}/payments/success`,
        cancelUrl: cancelUrl || `${baseUrl}/payments/cancel`,
        metadata,
      },
      "paypal"
    );

    return NextResponse.json(paymentResult);
  } catch (error: any) {
    logger.error("Error creating PayPal order", { error });
    return NextResponse.json(
      { error: error.message || "Failed to create order" },
      { status: 500 }
    );
  }
}
