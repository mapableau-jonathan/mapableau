/**
 * Publisher Payout API
 */

import { NextRequest, NextResponse } from "next/server";
import { AdvertisingPaymentService } from "@/lib/services/advertising/payment-service";
import { requireAuth } from "@/lib/security/authorization-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logger } from "@/lib/logger";

const payoutSchema = z.object({
  amount: z.number().positive().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const publisher = await prisma.publisher.findUnique({
      where: { userId: user.id },
    });

    if (!publisher) {
      return NextResponse.json(
        { error: "Publisher account not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data = payoutSchema.parse(body);

    const paymentService = new AdvertisingPaymentService();
    const result = await paymentService.requestPublisherPayout(
      publisher.id,
      data.amount
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("Error processing payout", error);
    return NextResponse.json(
      { error: error.message || "Failed to process payout" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const publisher = await prisma.publisher.findUnique({
      where: { userId: user.id },
    });

    if (!publisher) {
      return NextResponse.json(
        { error: "Publisher account not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const paymentService = new AdvertisingPaymentService();
    const payments = await paymentService.getPublisherPayments(
      publisher.id,
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
