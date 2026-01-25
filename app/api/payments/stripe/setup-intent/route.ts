/**
 * Create Stripe Setup Intent Endpoint
 * POST /api/payments/stripe/setup-intent
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { StripeAdapter } from "@/lib/services/abilitypay/banking/stripe-adapter";
import { unifiedPaymentService } from "@/lib/services/payments/unified-payment-service";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const stripeAdapter = new StripeAdapter({
  apiKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
});

/**
 * POST /api/payments/stripe/setup-intent
 * Create Setup Intent for saving payment methods
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { customerId, paymentMethodTypes } = body;

    // Get or create Stripe customer
    let stripeCustomerId = customerId;
    if (!stripeCustomerId) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { email: true, name: true },
      });

      if (user?.email) {
        const customer = await stripeAdapter.getOrCreateCustomer(
          user.email,
          undefined,
          user.name || undefined,
          { userId: session.user.id }
        );
        stripeCustomerId = customer.id;
      }
    }

    // Create setup intent
    const setupIntent = await stripeAdapter.createSetupIntent(
      stripeCustomerId,
      paymentMethodTypes || ["card", "link"]
    );

    return NextResponse.json({
      id: setupIntent.id,
      clientSecret: setupIntent.client_secret,
      status: setupIntent.status,
      customerId: stripeCustomerId,
    });
  } catch (error: any) {
    logger.error("Error creating Stripe setup intent", { error });
    return NextResponse.json(
      { error: error.message || "Failed to create setup intent" },
      { status: 500 }
    );
  }
}
