/**
 * Publisher Management API
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/security/authorization-utils";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createPublisherSchema = z.object({
  paymentMethod: z.enum(["bank", "paypal"]).optional(),
  paymentDetails: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check if publisher already exists
    const existing = await prisma.publisher.findUnique({
      where: { userId: user.id },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Publisher account already exists" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data = createPublisherSchema.parse(body);

    // Generate unique publisher code
    const publisherCode = `pub_${user.id.substring(0, 8)}_${Date.now().toString(36)}`;

    const publisher = await prisma.publisher.create({
      data: {
        userId: user.id,
        publisherCode,
        paymentMethod: data.paymentMethod,
        paymentDetails: data.paymentDetails || {},
        status: "PENDING",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(publisher, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("Error creating publisher", error);
    return NextResponse.json(
      { error: error.message || "Failed to create publisher" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const publisher = await prisma.publisher.findUnique({
      where: { userId: user.id },
      include: {
        adUnits: {
          orderBy: { createdAt: "desc" },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!publisher) {
      return NextResponse.json(
        { error: "Publisher account not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(publisher);
  } catch (error: any) {
    logger.error("Error fetching publisher", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch publisher" },
      { status: 500 }
    );
  }
}
