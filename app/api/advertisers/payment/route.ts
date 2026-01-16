/**
 * Advertiser Payment API
 */

import { NextRequest, NextResponse } from "next/server";
import { AdvertisingPaymentService } from "@/lib/services/advertising/payment-service";
import { requireAuth } from "@/lib/security/authorization-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logger } from "@/lib/logger";

const paymentSchema = z.object({
  advertiserId: z.string(),
  amount: z.number().positive(),
  paymentMethod: z.enum(["credit_card", "bank_transfer", "paypal"]),
  transactionId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const data = paymentSchema.parse(body);

    // Verify advertiser ownership
    const advertiser = await prisma.advertiser.findUnique({
      where: { id: data.advertiserId },
    });

    if (!advertiser || advertiser.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized: Advertiser not found or access denied" },
        { status: 403 }
      );
    }

    const paymentService = new AdvertisingPaymentService();
    const result = await paymentService.processAdvertiserPayment(
      data.advertiserId,
      data.amount,
      data.paymentMethod,
      data.transactionId
    );

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("Error processing advertiser payment", error);
    return NextResponse.json(
      { error: error.message || "Failed to process payment" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);
    const advertiserId = searchParams.get("advertiserId");

    if (!advertiserId) {
      return NextResponse.json(
        { error: "advertiserId parameter required" },
        { status: 400 }
      );
    }

    // Verify advertiser ownership
    const advertiser = await prisma.advertiser.findUnique({
      where: { id: advertiserId },
    });

    if (!advertiser || advertiser.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized: Advertiser not found or access denied" },
        { status: 403 }
      );
    }

    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const paymentService = new AdvertisingPaymentService();
    const payments = await paymentService.getAdvertiserPayments(
      advertiserId,
      limit
    );

    return NextResponse.json({ payments });
  } catch (error: any) {
    logger.error("Error fetching payments", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch payments" },
      { status: 500 }
    );
  }
}
