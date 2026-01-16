/**
 * Tokenization API
 * POST /api/abilitypay/tokens/mint - Tokenize budget category
 * GET /api/abilitypay/tokens - List tokens (with query params)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { TokenService } from "@/lib/services/abilitypay";
import { createBlockchainAdapter } from "@/lib/services/abilitypay/blockchain";
import { z } from "zod";

const blockchainConfig = {
  provider: (process.env.BLOCKCHAIN_PROVIDER || "mock") as
    | "ethereum"
    | "hyperledger"
    | "polygon"
    | "mock",
  networkUrl: process.env.BLOCKCHAIN_NETWORK_URL,
  privateKey: process.env.BLOCKCHAIN_PRIVATE_KEY,
  contractAddress: process.env.BLOCKCHAIN_CONTRACT_ADDRESS,
};

const tokenService = new TokenService(blockchainConfig);

const mintTokenSchema = z.object({
  categoryId: z.string(),
  recipientAddress: z.string(),
  amount: z.number().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = mintTokenSchema.parse(body);

    const voucher = await tokenService.tokenizeCategory(data);
    return NextResponse.json(voucher, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to mint token" },
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
    const planId = searchParams.get("planId");

    if (planId) {
      const tokens = await tokenService.getPlanTokens(planId);
      return NextResponse.json(tokens);
    }

    return NextResponse.json(
      { error: "planId query parameter required" },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get tokens" },
      { status: 500 }
    );
  }
}
