/**
 * Token Balance API
 * GET /api/abilitypay/tokens/[id]/balance - Query blockchain balance
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { TokenService } from "@/lib/services/abilitypay";
import { createBlockchainAdapter } from "@/lib/services/abilitypay/blockchain";

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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "address query parameter required" },
        { status: 400 }
      );
    }

    const balance = await tokenService.getTokenBalance(params.id, address);
    return NextResponse.json({
      tokenId: params.id,
      address,
      balance: balance.toString(),
      balanceAUD: Number(balance) / 100, // Convert from cents to AUD
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get balance" },
      { status: 500 }
    );
  }
}
