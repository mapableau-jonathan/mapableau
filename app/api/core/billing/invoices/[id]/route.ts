/**
 * MapAble Core - Billing API
 * GET /api/core/billing/invoices/[id] - Get invoice by ID
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next/auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { billingService } from "@/lib/services/core";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invoice = await billingService.getInvoice(params.id);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Verify invoice belongs to user
    if (invoice.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    logger.error("Failed to get invoice", error);
    return NextResponse.json(
      { error: "Failed to get invoice" },
      { status: 500 }
    );
  }
}
