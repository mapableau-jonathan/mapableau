/**
 * Invoice Management Endpoint (Admin-Only)
 * GET /api/admin/billing/invoices
 * POST /api/admin/billing/invoices
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/security/authorization-utils";
import { BillingService } from "@/lib/services/core/billing-service";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const billingService = new BillingService();

/**
 * GET /api/admin/billing/invoices
 * List all invoices (admin-only)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const userId = request.nextUrl.searchParams.get("userId") || undefined;
    const status = request.nextUrl.searchParams.get("status") || undefined;
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50", 10);
    const offset = parseInt(request.nextUrl.searchParams.get("offset") || "0", 10);

    const where: any = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      take: limit,
      skip: offset,
    });

    const total = await prisma.invoice.count({ where });

    return NextResponse.json({
      invoices,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error: any) {
    if (error.message?.includes("Forbidden") || error.message?.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    logger.error("Error getting invoices", { error });
    return NextResponse.json(
      { error: error.message || "Failed to get invoices" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/billing/invoices
 * Create manual invoice or adjustment
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { action, invoiceId, adjustments } = body;

    if (action === "createManual") {
      // Create manual invoice
      const invoice = await billingService.createInvoice({
        userId: body.userId,
        amount: body.amount,
        taxAmount: body.taxAmount || 0,
        currency: body.currency || "AUD",
        dueDate: new Date(body.dueDate),
        lineItems: body.lineItems || [],
        metadata: body.metadata,
      });

      return NextResponse.json({ invoice });
    }

    if (action === "adjust" && invoiceId) {
      // Apply manual adjustments
      const invoice = await billingService.getInvoice(invoiceId);
      if (!invoice) {
        return NextResponse.json(
          { error: "Invoice not found" },
          { status: 404 }
        );
      }

      // Update invoice with adjustments
      const updatedInvoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          amount: adjustments.amount !== undefined ? adjustments.amount : invoice.amount,
          taxAmount: adjustments.taxAmount !== undefined ? adjustments.taxAmount : invoice.taxAmount,
          totalAmount: adjustments.totalAmount !== undefined ? adjustments.totalAmount : invoice.totalAmount,
          metadata: {
            ...((invoice.metadata as any) || {}),
            adjustments: {
              ...adjustments,
              adjustedAt: new Date().toISOString(),
              adjustedBy: body.adjustedBy,
            },
          } as any,
        },
      });

      return NextResponse.json({ invoice: updatedInvoice });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    logger.error("Error in invoice management", { error });
    return NextResponse.json(
      { error: error.message || "Failed to process invoice action" },
      { status: 500 }
    );
  }
}
