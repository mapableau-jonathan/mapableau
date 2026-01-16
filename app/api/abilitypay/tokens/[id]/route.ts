/**
 * Token Details API
 * GET /api/abilitypay/tokens/[id] - Get token details
 * POST /api/abilitypay/tokens/[id]/validate - Validate token rules
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

const validateTokenSchema = z.object({
  serviceCode: z.string(),
  providerId: z.string(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = await tokenService.getToken(params.id);
    return NextResponse.json(token);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get token" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = validateTokenSchema.parse(body);

    const validation = await tokenService.validateTokenRules(
      params.id,
      data.serviceCode,
      data.providerId
    );

    return NextResponse.json(validation);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to validate token" },
      { status: 500 }
    );
  }
}
