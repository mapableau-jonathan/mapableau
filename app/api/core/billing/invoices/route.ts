/**
 * MapAble Core - Billing API
 * GET /api/core/billing/invoices - Get user invoices
 * POST /api/core/billing/invoices - Create invoice
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { billingService } from "@/lib/services/core";
import { logger } from "@/lib/logger";

const createInvoiceSchema = z.object({
  subscriptionId: z.string().optional(),
  amount: z.number().positive(),
  taxAmount: z.number().min(0).optional(),
  currency: z.string().default("AUD"),
  dueDate: z.string().datetime(),
  lineItems: z.array(
    z.object({
      description: z.string(),
      quantity: z.number().positive(),
      unitPrice: z.number().positive(),
      total: z.number().positive(),
      serviceType: z.string().optional(),
    })
  ),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    const invoices = await billingService.getUserInvoices(session.user.id, {
      ...(status && { status: status as any }),
      ...(limit && { limit: parseInt(limit) }),
      ...(offset && { offset: parseInt(offset) }),
    });

    return NextResponse.json({ invoices });
  } catch (error) {
    logger.error("Failed to get invoices", error);
    return NextResponse.json(
      { error: "Failed to get invoices" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = createInvoiceSchema.parse(body);

    const invoice = await billingService.createInvoice({
      userId: session.user.id,
      subscriptionId: data.subscriptionId,
      amount: data.amount,
      taxAmount: data.taxAmount,
      currency: data.currency,
      dueDate: new Date(data.dueDate),
      lineItems: data.lineItems,
      metadata: data.metadata,
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("Failed to create invoice", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
