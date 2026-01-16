/**
 * MetaMask Payment API
 * POST /api/abilitypay/payments/metamask - Initiate MetaMask payment
 * POST /api/abilitypay/payments/metamask/process - Process MetaMask payment transaction
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PaymentService } from "@/lib/services/abilitypay";
import { EthereumDLTService } from "@/lib/services/abilitypay/blockchain/ethereum-dlt-service";
import { MetaMaskAdapter } from "@/lib/services/abilitypay/wallet";
import { createBlockchainAdapter } from "@/lib/services/abilitypay/blockchain";
import { z } from "zod";

const blockchainConfig = {
  provider: (process.env.BLOCKCHAIN_PROVIDER || "ethereum") as
    | "ethereum"
    | "hyperledger"
    | "polygon"
    | "mock",
  networkUrl: process.env.ETHEREUM_RPC_URL || process.env.BLOCKCHAIN_NETWORK_URL,
  privateKey: process.env.BLOCKCHAIN_PRIVATE_KEY,
  contractAddress: process.env.ETHEREUM_CONTRACT_ADDRESS || process.env.BLOCKCHAIN_CONTRACT_ADDRESS,
};

const paymentService = new PaymentService(blockchainConfig);
const ethereumDLTService = new EthereumDLTService({
  networkUrl: process.env.ETHEREUM_RPC_URL || process.env.BLOCKCHAIN_NETWORK_URL || "",
  contractAddress: process.env.ETHEREUM_CONTRACT_ADDRESS || process.env.BLOCKCHAIN_CONTRACT_ADDRESS,
});
const metamaskAdapter = new MetaMaskAdapter({
  contractAddress: process.env.ETHEREUM_CONTRACT_ADDRESS || process.env.BLOCKCHAIN_CONTRACT_ADDRESS,
});

const initiateMetaMaskPaymentSchema = z.object({
  participantId: z.string(),
  providerId: z.string(),
  serviceCode: z.string(),
  serviceDescription: z.string().optional(),
  amount: z.number().positive(),
  categoryId: z.string(),
  fromAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
  workerId: z.string().optional(),
});

const processMetaMaskPaymentSchema = z.object({
  transactionId: z.string(),
  rawTransaction: z.string().regex(/^0x[a-fA-F0-9]+$/, "Invalid transaction hex"),
  transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid transaction hash"),
  from: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "initiate";

    if (action === "initiate") {
      const body = await request.json();
      const data = initiateMetaMaskPaymentSchema.parse(body);

      // SECURITY: Verify user has access to the participant
      if (data.participantId !== session.user.id) {
        return NextResponse.json(
          { error: "Unauthorized: Cannot make payments for other participants" },
          { status: 403 }
        );
      }

      // Verify from address matches participant (or is authorized)
      // In production, store wallet addresses linked to user accounts

      // Initiate payment (creates transaction record)
      const transaction = await paymentService.initiatePayment({
        participantId: data.participantId,
        providerId: data.providerId,
        serviceCode: data.serviceCode,
        serviceDescription: data.serviceDescription,
        amount: data.amount,
        categoryId: data.categoryId,
        workerId: data.workerId,
        paymentMethod: "blockchain", // Use blockchain for MetaMask
      });

      // Prepare transaction data for MetaMask
      const contractAddress = process.env.ETHEREUM_CONTRACT_ADDRESS || process.env.BLOCKCHAIN_CONTRACT_ADDRESS;
      if (!contractAddress) {
        throw new Error("Ethereum contract address not configured");
      }

      // Encode transfer function call
      const amountInWei = metamaskAdapter.ethToWei(data.amount / 100); // Convert AUD to ETH equivalent (simplified)
      const transferData = metamaskAdapter.encodeTransferFunction(
        data.providerId, // Provider's Ethereum address (would need to be stored/looked up)
        amountInWei,
      );

      // Estimate gas
      const gasEstimate = await ethereumDLTService.estimateGas({
        from: data.fromAddress,
        to: contractAddress,
        data: transferData,
      });

      const gasPrice = await ethereumDLTService.getGasPrice();

      return NextResponse.json({
        transactionId: transaction.id,
        transaction: {
          to: contractAddress,
          value: "0x0", // Token transfer, no ETH value
          data: transferData,
          gasLimit: `0x${gasEstimate.toString(16)}`,
          gasPrice: `0x${gasPrice.toString(16)}`,
        },
        network: await ethereumDLTService.getNetworkInfo(),
      });
    }

    if (action === "process") {
      const body = await request.json();
      const data = processMetaMaskPaymentSchema.parse(body);

      // Get transaction
      const transaction = await paymentService.getPaymentStatus(data.transactionId);

      // SECURITY: Verify user has access
      if (transaction.participantId !== session.user.id) {
        return NextResponse.json(
          { error: "Unauthorized: Cannot process this transaction" },
          { status: 403 }
        );
      }

      // Validate transaction signature
      if (!metamaskAdapter.validateTransactionSignature(
        {
          rawTransaction: data.rawTransaction,
          transactionHash: data.transactionHash,
          from: data.from,
        },
        data.from
      )) {
        return NextResponse.json(
          { error: "Invalid transaction signature" },
          { status: 400 }
        );
      }

      // Process the MetaMask transaction
      const result = await ethereumDLTService.processMetaMaskTransaction({
        rawTransaction: data.rawTransaction,
        transactionHash: data.transactionHash,
        from: data.from,
      });

      if (!result.success) {
        // Update transaction status
        await paymentService.getPaymentStatus(data.transactionId); // This will update status
        return NextResponse.json(
          { error: result.error || "Transaction failed" },
          { status: 500 }
        );
      }

      // Execute payment (updates transaction, voucher, category)
      await paymentService.executePayment(data.transactionId);

      return NextResponse.json({
        success: true,
        transactionId: data.transactionId,
        blockchainTxHash: result.txHash,
        blockNumber: result.blockNumber,
        gasUsed: result.gasUsed?.toString(),
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to process MetaMask payment" },
      { status: 500 }
    );
  }
}
