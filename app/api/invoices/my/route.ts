/**
 * User's Invoices Endpoint
 * GET /api/invoices/my
 * Returns user's invoices with limited data (no analytics)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { BillingService } from "@/lib/services/core/billing-service";
import { analyticsFilter } from "@/lib/services/analytics/analytics-filter";
import { logger } from "@/lib/logger";

const billingService = new BillingService();

/**
 * GET /api/invoices/my
 * Get user's own invoices (limited data, no analytics)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = request.nextUrl.searchParams.get("status") || undefined;
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50", 10);
    const offset = parseInt(request.nextUrl.searchParams.get("offset") || "0", 10);

    const invoices = await billingService.getUserInvoices(session.user.id, {
      status: status as any,
      limit,
      offset,
    });

    // Sanitize invoices to hide analytics data
    const sanitized = invoices.map((invoice) =>
      analyticsFilter.sanitizeInvoiceForUser(
        invoice,
        session.user.id,
        session.user.role || null
      )
    ).filter(Boolean);

    return NextResponse.json({ invoices: sanitized });
  } catch (error: any) {
    logger.error("Error getting user invoices", { error });
    return NextResponse.json(
      { error: error.message || "Failed to get invoices" },
      { status: 500 }
    );
  }
}
