/**
 * Pay Invoice Endpoint
 * POST /api/payments/invoices/[invoiceId]/pay
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { invoicePaymentService } from "@/lib/services/billing/invoice-payment-service";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * POST /api/payments/invoices/[invoiceId]/pay
 * Initiate payment for an invoice
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { invoiceId } = await params;
    const body = await request.json();

    // Verify invoice belongs to user
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    if (invoice.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden: Invoice does not belong to you" },
        { status: 403 }
      );
    }

    if (invoice.status === "PAID") {
      return NextResponse.json(
        { error: "Invoice already paid" },
        { status: 400 }
      );
    }

    // Initiate payment
    const paymentResult = await invoicePaymentService.initiatePayment({
      invoiceId,
      paymentProvider: body.provider || "stripe",
      savedPaymentMethodId: body.paymentMethodId,
      metadata: body.metadata,
    });

    return NextResponse.json(paymentResult);
  } catch (error: any) {
    logger.error("Error initiating invoice payment", { error });
    return NextResponse.json(
      { error: error.message || "Failed to initiate payment" },
      { status: 500 }
    );
  }
}
