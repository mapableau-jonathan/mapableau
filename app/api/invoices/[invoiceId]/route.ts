/**
 * Invoice Details Endpoint
 * GET /api/invoices/[invoiceId]
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { BillingService } from "@/lib/services/core/billing-service";
import { analyticsFilter } from "@/lib/services/analytics/analytics-filter";
import { logger } from "@/lib/logger";

const billingService = new BillingService();

/**
 * GET /api/invoices/[invoiceId]
 * Get invoice details (user's own invoice only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { invoiceId } = await params;
    const invoice = await billingService.getInvoice(invoiceId);

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Verify user owns invoice
    if (invoice.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden: Invoice does not belong to you" },
        { status: 403 }
      );
    }

    // Sanitize invoice to hide analytics
    const sanitized = analyticsFilter.sanitizeInvoiceForUser(
      invoice,
      session.user.id,
      session.user.role || null
    );

    return NextResponse.json({ invoice: sanitized });
  } catch (error: any) {
    logger.error("Error getting invoice", { error });
    return NextResponse.json(
      { error: error.message || "Failed to get invoice" },
      { status: 500 }
    );
  }
}
