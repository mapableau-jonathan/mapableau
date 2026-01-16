/**
 * Payment Details API
 * GET /api/abilitypay/payments/[id] - Get payment status
 * POST /api/abilitypay/payments/[id]/execute - Execute payment
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PaymentService } from "@/lib/services/abilitypay";
import { createBlockchainAdapter } from "@/lib/services/abilitypay/blockchain";
import { verifyTransactionAccess } from "@/lib/security/authorization";

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

const paymentService = new PaymentService(blockchainConfig);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // SECURITY: Verify user has access to this transaction
    const hasAccess = await verifyTransactionAccess(session.user.id, params.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Unauthorized: Cannot access this transaction" },
        { status: 403 }
      );
    }

    const transaction = await paymentService.getPaymentStatus(params.id);
    return NextResponse.json(transaction);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get payment status" },
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
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // SECURITY: Verify user has access to this transaction before execution
    const hasAccess = await verifyTransactionAccess(session.user.id, params.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Unauthorized: Cannot execute this transaction" },
        { status: 403 }
      );
    }

    // SECURITY: Add idempotency check to prevent duplicate execution
    // In production, implement idempotency key checking here

    const transaction = await paymentService.executePayment(params.id);
    return NextResponse.json(transaction);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to execute payment" },
      { status: 500 }
    );
  }
}
