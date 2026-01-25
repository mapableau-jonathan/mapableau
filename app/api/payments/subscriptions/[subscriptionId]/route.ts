/**
 * Subscription Management Endpoint
 * GET /api/payments/subscriptions/[subscriptionId]
 * DELETE /api/payments/subscriptions/[subscriptionId]
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { subscriptionService } from "@/lib/services/payments/subscription-service";
import { logger } from "@/lib/logger";

/**
 * GET /api/payments/subscriptions/[subscriptionId]
 * Get subscription details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subscriptionId } = await params;
    const subscription = await subscriptionService.getSubscription(subscriptionId);

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    // Verify user owns subscription
    if (subscription.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    return NextResponse.json({ subscription });
  } catch (error: any) {
    logger.error("Error getting subscription", { error });
    return NextResponse.json(
      { error: error.message || "Failed to get subscription" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/payments/subscriptions/[subscriptionId]
 * Cancel subscription
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subscriptionId } = await params;
    const body = await request.json().catch(() => ({}));

    // Verify user owns subscription
    const subscription = await subscriptionService.getSubscription(subscriptionId);
    if (!subscription || subscription.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Subscription not found or access denied" },
        { status: 404 }
      );
    }

    await subscriptionService.cancelSubscription(
      subscriptionId,
      body.cancelAtPeriodEnd !== false
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error("Error cancelling subscription", { error });
    return NextResponse.json(
      { error: error.message || "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
