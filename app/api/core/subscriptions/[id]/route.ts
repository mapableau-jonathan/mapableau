/**
 * MapAble Core - Subscriptions API
 * GET /api/core/subscriptions/[id] - Get subscription
 * PATCH /api/core/subscriptions/[id] - Update subscription
 * DELETE /api/core/subscriptions/[id] - Cancel subscription
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { subscriptionService } from "@/lib/services/core";
import { SubscriptionTier, SubscriptionStatus } from "@prisma/client";
import { logger } from "@/lib/logger";

const updateSubscriptionSchema = z.object({
  tier: z.nativeEnum(SubscriptionTier).optional(),
  status: z.nativeEnum(SubscriptionStatus).optional(),
  endDate: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await subscriptionService.getSubscription(params.id);

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    if (subscription.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ subscription });
  } catch (error) {
    logger.error("Failed to get subscription", error);
    return NextResponse.json(
      { error: "Failed to get subscription" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await subscriptionService.getSubscription(params.id);
    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    if (subscription.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = updateSubscriptionSchema.parse(body);

    const updatedSubscription = await subscriptionService.updateSubscription(
      params.id,
      {
        tier: data.tier,
        status: data.status,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        metadata: data.metadata,
      }
    );

    return NextResponse.json({ subscription: updatedSubscription });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("Failed to update subscription", error);
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await subscriptionService.getSubscription(params.id);
    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    if (subscription.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const reason = searchParams.get("reason");

    const cancelledSubscription = await subscriptionService.cancelSubscription(
      params.id,
      reason ?? undefined
    );

    return NextResponse.json({ subscription: cancelledSubscription });
  } catch (error) {
    logger.error("Failed to cancel subscription", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
