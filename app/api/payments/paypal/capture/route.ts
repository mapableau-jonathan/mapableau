/**
 * Capture PayPal Order Endpoint
 * POST /api/payments/paypal/capture
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { unifiedPaymentService } from "@/lib/services/payments/unified-payment-service";
import { invoicePaymentService } from "@/lib/services/billing/invoice-payment-service";
import { logger } from "@/lib/logger";

/**
 * POST /api/payments/paypal/capture
 * Capture PayPal order after approval
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Capture payment
    const result = await unifiedPaymentService.capturePayment(orderId);

    // If invoice ID is in metadata, update invoice
    const metadata = result.metadata as any;
    if (metadata?.invoiceId) {
      await invoicePaymentService.handlePaymentSuccess(
        metadata.invoiceId,
        result.paymentId,
        "paypal"
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    logger.error("Error capturing PayPal order", { error });
    return NextResponse.json(
      { error: error.message || "Failed to capture order" },
      { status: 500 }
    );
  }
}
