/**
 * Saved Payment Methods Endpoint
 * GET /api/payments/methods/saved
 * POST /api/payments/methods/saved
 * DELETE /api/payments/methods/saved/[methodId]
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { unifiedPaymentService } from "@/lib/services/payments/unified-payment-service";
import { StripeAdapter } from "@/lib/services/abilitypay/banking/stripe-adapter";
import { PayPalAdapter } from "@/lib/services/abilitypay/banking/paypal-adapter";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const stripeAdapter = new StripeAdapter({
  apiKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
});

const paypalAdapter = new PayPalAdapter({
  clientId: process.env.PAYPAL_CLIENT_ID,
  clientSecret: process.env.PAYPAL_CLIENT_SECRET,
  environment: (process.env.PAYPAL_ENVIRONMENT || "sandbox") as "sandbox" | "production",
});

/**
 * GET /api/payments/methods/saved
 * List saved payment methods
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const provider = request.nextUrl.searchParams.get("provider") || undefined;

    const methods = await unifiedPaymentService.getSavedPaymentMethods(
      session.user.id,
      provider as any
    );

    return NextResponse.json({ methods });
  } catch (error: any) {
    logger.error("Error getting saved payment methods", { error });
    return NextResponse.json(
      { error: error.message || "Failed to get payment methods" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payments/methods/saved
 * Save payment method from setup intent or vault token
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { provider, setupIntentId, paymentMethodId, vaultToken } = body;

    if (provider === "stripe" && setupIntentId) {
      // Get setup intent to retrieve payment method
      const setupIntent = await stripeAdapter["stripe"].setupIntents.retrieve(setupIntentId);
      const pmId = setupIntent.payment_method as string;

      if (pmId) {
        // Get payment method details
        const pm = await stripeAdapter.getPaymentMethod(pmId);

        // Save payment method
        const saved = await unifiedPaymentService.savePaymentMethod(
          "stripe",
          session.user.id,
          {
            providerPaymentMethodId: pmId,
            type: pm.type,
            last4: pm.card?.last4,
            brand: pm.card?.brand,
            expiryMonth: pm.card?.exp_month,
            expiryYear: pm.card?.exp_year,
            metadata: {
              setupIntentId,
            },
          }
        );

        return NextResponse.json({ paymentMethod: saved });
      }
    }

    if (provider === "paypal" && vaultToken) {
      // Save PayPal vault token
      const saved = await unifiedPaymentService.savePaymentMethod(
        "paypal",
        session.user.id,
        {
          providerPaymentMethodId: vaultToken,
          type: "paypal",
          metadata: {
            vaultToken,
          },
        }
      );

      return NextResponse.json({ paymentMethod: saved });
    }

    return NextResponse.json(
      { error: "Invalid request. Provide setupIntentId for Stripe or vaultToken for PayPal" },
      { status: 400 }
    );
  } catch (error: any) {
    logger.error("Error saving payment method", { error });
    return NextResponse.json(
      { error: error.message || "Failed to save payment method" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/payments/methods/saved/[methodId]
 * Delete saved payment method
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ methodId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { methodId } = await params;

    await unifiedPaymentService.deletePaymentMethod(methodId, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error("Error deleting payment method", { error });
    return NextResponse.json(
      { error: error.message || "Failed to delete payment method" },
      { status: 500 }
    );
  }
}
