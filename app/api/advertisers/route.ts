/**
 * Advertiser Management API
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/security/authorization-utils";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { Decimal } from "@prisma/client/runtime/library";

const createAdvertiserSchema = z.object({
  businessId: z.string().optional(),
  creditLimit: z.number().positive().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check if advertiser already exists
    const existing = await prisma.advertiser.findUnique({
      where: { userId: user.id },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Advertiser account already exists" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data = createAdvertiserSchema.parse(body);

    const advertiser = await prisma.advertiser.create({
      data: {
        userId: user.id,
        businessId: data.businessId,
        creditLimit: data.creditLimit ? new Decimal(data.creditLimit) : new Decimal(1000),
        status: "PENDING",
        balance: new Decimal(0),
        totalSpent: new Decimal(0),
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

    return NextResponse.json(advertiser, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("Error creating advertiser", error);
    return NextResponse.json(
      { error: error.message || "Failed to create advertiser" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const advertiser = await prisma.advertiser.findUnique({
      where: { userId: user.id },
      include: {
        campaigns: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!advertiser) {
      return NextResponse.json(
        { error: "Advertiser account not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(advertiser);
  } catch (error: any) {
    logger.error("Error fetching advertiser", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch advertiser" },
      { status: 500 }
    );
  }
}
