/**
 * Redemption API
 * POST /api/abilitypay/redemptions - Request redemption
 * GET /api/abilitypay/redemptions - Get redemption history
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { RedemptionService } from "@/lib/services/abilitypay";
import { NPPAdapter } from "@/lib/services/abilitypay/banking";
import { z } from "zod";

const nppAdapter = new NPPAdapter({
  apiUrl: process.env.NPP_API_URL,
  apiKey: process.env.NPP_API_KEY,
  merchantId: process.env.NPP_MERCHANT_ID,
});

const redemptionService = new RedemptionService(nppAdapter);

const requestRedemptionSchema = z.object({
  providerId: z.string(),
  transactionIds: z.array(z.string()),
  bankAccountDetails: z.object({
    accountNumber: z.string(),
    bsb: z.string(),
    accountName: z.string(),
    payId: z.string().optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = requestRedemptionSchema.parse(body);

    const redemption = await redemptionService.requestRedemption(data);
    return NextResponse.json(redemption, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to request redemption" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId");

    if (!providerId) {
      return NextResponse.json(
        { error: "providerId query parameter required" },
        { status: 400 }
      );
    }

    const redemptions = await redemptionService.getProviderRedemptions(
      providerId
    );
    return NextResponse.json(redemptions);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get redemptions" },
      { status: 500 }
    );
  }
}
