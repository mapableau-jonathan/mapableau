/**
 * MapAble Core - Subscriptions API
 * GET /api/core/subscriptions - Get user subscriptions
 * POST /api/core/subscriptions - Create subscription
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { subscriptionService } from "@/lib/services/core";
import { SubscriptionTier, ServiceType } from "@prisma/client";
import { logger } from "@/lib/logger";

const createSubscriptionSchema = z.object({
  serviceType: z.nativeEnum(ServiceType).optional(),
  tier: z.nativeEnum(SubscriptionTier),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const serviceType = searchParams.get("serviceType");

    const subscriptions = await subscriptionService.getUserSubscriptions(
      session.user.id,
      serviceType ? (serviceType as ServiceType) : undefined
    );

    return NextResponse.json({ subscriptions });
  } catch (error) {
    logger.error("Failed to get subscriptions", error);
    return NextResponse.json(
      { error: "Failed to get subscriptions" },
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
    const data = createSubscriptionSchema.parse(body);

    const subscription = await subscriptionService.createSubscription({
      userId: session.user.id,
      serviceType: data.serviceType,
      tier: data.tier,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      metadata: data.metadata,
    });

    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("Failed to create subscription", error);
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}
