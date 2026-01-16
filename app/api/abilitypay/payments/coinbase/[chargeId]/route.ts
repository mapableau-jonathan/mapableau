/**
 * Coinbase Charge Details API
 * GET /api/abilitypay/payments/coinbase/[chargeId] - Get charge details
 * POST /api/abilitypay/payments/coinbase/[chargeId]/cancel - Cancel charge
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { CoinbaseAdapter } from "@/lib/services/abilitypay/banking";

const coinbaseAdapter = new CoinbaseAdapter({
  apiKey: process.env.COINBASE_API_KEY,
  apiSecret: process.env.COINBASE_API_SECRET,
  apiUrl: process.env.COINBASE_API_URL,
  webhookSecret: process.env.COINBASE_WEBHOOK_SECRET,
});

export async function GET(
  request: NextRequest,
  { params }: { params: { chargeId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const charge = await coinbaseAdapter.getCharge(params.chargeId);
    const status = coinbaseAdapter.getPaymentStatus(charge);

    return NextResponse.json({
      chargeId: charge.id,
      code: charge.code,
      status,
      amount: parseFloat(charge.pricing.local.amount),
      currency: charge.pricing.local.currency,
      hostedUrl: charge.hosted_url,
      createdAt: charge.created_at,
      expiresAt: charge.expires_at,
      confirmedAt: charge.confirmed_at,
      payments: charge.payments,
      timeline: charge.timeline,
      metadata: charge.metadata,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get charge details" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { chargeId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "cancel";

    if (action === "cancel") {
      const charge = await coinbaseAdapter.cancelCharge(params.chargeId);
      return NextResponse.json({
        chargeId: charge.id,
        status: "CANCELLED",
        message: "Charge cancelled successfully",
      });
    }

    if (action === "resolve") {
      // Only admins should be able to resolve charges
      // TODO: Add admin check
      const charge = await coinbaseAdapter.resolveCharge(params.chargeId);
      return NextResponse.json({
        chargeId: charge.id,
        status: "RESOLVED",
        message: "Charge resolved successfully",
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to perform action" },
      { status: 500 }
    );
  }
}
