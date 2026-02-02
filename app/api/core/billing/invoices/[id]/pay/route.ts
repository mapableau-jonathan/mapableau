/**
 * MapAble Core - Billing API
 * POST /api/core/billing/invoices/[id]/pay - Record payment for invoice
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { billingService } from "@/lib/services/core";
import { PaymentMethod } from "@prisma/client";
import { logger } from "@/lib/logger";

const paymentSchema = z.object({
  paymentMethod: z.nativeEnum(PaymentMethod),
  paymentReference: z.string().optional(),
  amount: z.number().positive().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = paymentSchema.parse(body);

    const invoice = await billingService.getInvoice(params.id);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updatedInvoice = await billingService.recordPayment({
      invoiceId: params.id,
      paymentMethod: data.paymentMethod,
      paymentReference: data.paymentReference,
      amount: data.amount,
    });

    return NextResponse.json({ invoice: updatedInvoice });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("Failed to record payment", error);
    return NextResponse.json(
      { error: "Failed to record payment" },
      { status: 500 }
    );
  }
}
