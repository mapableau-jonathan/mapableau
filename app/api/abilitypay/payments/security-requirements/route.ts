/**
 * Payment Security Requirements API
 * GET /api/abilitypay/payments/security-requirements - Get security requirements for a payment
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PaymentSecurityService } from "@/lib/services/abilitypay/payment-security";
import { z } from "zod";
import { logger } from "@/lib/logger";

const querySchema = z.object({
  amount: z.string().transform((val) => parseFloat(val)),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const amount = searchParams.get("amount");

    if (!amount) {
      return NextResponse.json(
        { error: "Amount parameter required" },
        { status: 400 }
      );
    }

    const paymentSecurity = new PaymentSecurityService({
      highValueThreshold: 1000,
    });

    const requirements = await paymentSecurity.getSecurityRequirements(
      session.user.id,
      parseFloat(amount)
    );

    const authOptions = await paymentSecurity.generatePaymentAuthOptions(
      session.user.id,
      parseFloat(amount)
    );

    return NextResponse.json({
      requiresTOTP: requirements.requiresTOTP,
      requiresBiometric: requirements.requiresBiometric,
      hasTOTP: requirements.hasTOTP,
      hasBiometric: requirements.hasBiometric,
      biometricOptions: authOptions.biometricOptions,
    });
  } catch (error: any) {
    logger.error("Failed to get security requirements", error);
    return NextResponse.json(
      { error: error.message || "Failed to get security requirements" },
      { status: 500 }
    );
  }
}
