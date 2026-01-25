/**
 * Subscriptions Management Endpoint
 * GET /api/payments/subscriptions
 * POST /api/payments/subscriptions
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { subscriptionService } from "@/lib/services/payments/subscription-service";
import { logger } from "@/lib/logger";

/**
 * GET /api/payments/subscriptions
 * Get user subscriptions
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscriptions = await subscriptionService.getUserSubscriptions(session.user.id);

    return NextResponse.json({ subscriptions });
  } catch (error: any) {
    logger.error("Error getting subscriptions", { error });
    return NextResponse.json(
      { error: error.message || "Failed to get subscriptions" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payments/subscriptions
 * Create subscription
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { planId, provider, paymentMethodId } = body;

    if (!planId || !provider) {
      return NextResponse.json(
        { error: "Plan ID and provider are required" },
        { status: 400 }
      );
    }

    const subscription = await subscriptionService.createSubscription({
      userId: session.user.id,
      planId,
      paymentProvider: provider,
      paymentMethodId,
    });

    return NextResponse.json({ subscription });
  } catch (error: any) {
    logger.error("Error creating subscription", { error });
    return NextResponse.json(
      { error: error.message || "Failed to create subscription" },
      { status: 500 }
    );
  }
}
