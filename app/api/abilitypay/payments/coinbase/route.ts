/**
 * Coinbase Payment API
 * POST /api/abilitypay/payments/coinbase - Initiate Coinbase payment
 * GET /api/abilitypay/payments/coinbase/[chargeId] - Get payment status
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PaymentProviderService } from "@/lib/services/abilitypay/banking";
import { z } from "zod";

const paymentProviderService = new PaymentProviderService({
  provider: "coinbase",
  coinbaseConfig: {
    apiKey: process.env.COINBASE_API_KEY,
    apiSecret: process.env.COINBASE_API_SECRET,
    apiUrl: process.env.COINBASE_API_URL,
    webhookSecret: process.env.COINBASE_WEBHOOK_SECRET,
  },
});

const initiateCoinbasePaymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default("AUD"),
  description: z.string(),
  reference: z.string(), // Transaction reference
  redirectUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = initiateCoinbasePaymentSchema.parse(body);

    // Validate amount
    if (data.amount < 0.01 || data.amount > 100000) {
      return NextResponse.json(
        { error: "Amount must be between $0.01 and $100,000" },
        { status: 400 }
      );
    }

    const payment = await paymentProviderService.initiatePayment(
      {
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        reference: data.reference,
        redirectUrl: data.redirectUrl,
        cancelUrl: data.cancelUrl,
        metadata: {
          userId: session.user.id,
          ...data.metadata,
        },
      },
      "coinbase"
    );

    return NextResponse.json(payment, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to initiate Coinbase payment" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chargeId = searchParams.get("chargeId");

    if (!chargeId) {
      return NextResponse.json(
        { error: "chargeId query parameter required" },
        { status: 400 }
      );
    }

    const status = await paymentProviderService.getPaymentStatus(
      chargeId,
      "coinbase"
    );

    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get payment status" },
      { status: 500 }
    );
  }
}
