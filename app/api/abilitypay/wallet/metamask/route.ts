/**
 * MetaMask Wallet API
 * POST /api/abilitypay/wallet/metamask/validate - Validate MetaMask transaction
 * POST /api/abilitypay/wallet/metamask/process - Process MetaMask-signed transaction
 * GET /api/abilitypay/wallet/metamask/status - Get transaction status
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { MetaMaskAdapter } from "@/lib/services/abilitypay/wallet";
import { EthereumDLTService } from "@/lib/services/abilitypay/blockchain/ethereum-dlt-service";
import { z } from "zod";

const metamaskAdapter = new MetaMaskAdapter({
  contractAddress: process.env.ETHEREUM_CONTRACT_ADDRESS || process.env.BLOCKCHAIN_CONTRACT_ADDRESS,
});

const ethereumDLTService = new EthereumDLTService({
  networkUrl: process.env.ETHEREUM_RPC_URL || process.env.BLOCKCHAIN_NETWORK_URL || "",
  contractAddress: process.env.ETHEREUM_CONTRACT_ADDRESS || process.env.BLOCKCHAIN_CONTRACT_ADDRESS,
});

const validateTransactionSchema = z.object({
  from: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
  value: z.string().optional(), // Amount in wei (hex string)
  data: z.string().optional(), // Contract call data (hex string)
  gasLimit: z.string().optional(),
  gasPrice: z.string().optional(),
});

const processTransactionSchema = z.object({
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
    const action = searchParams.get("action") || "validate";

    const body = await request.json();

    if (action === "validate") {
      const data = validateTransactionSchema.parse(body);

      // Validate addresses
      if (!metamaskAdapter.isValidAddress(data.from)) {
        return NextResponse.json(
          { error: "Invalid from address" },
          { status: 400 }
        );
      }

      if (!metamaskAdapter.isValidAddress(data.to)) {
        return NextResponse.json(
          { error: "Invalid to address" },
          { status: 400 }
        );
      }

      // Validate transaction
      const validation = await ethereumDLTService.validateTransaction({
        from: data.from,
        to: data.to,
        value: data.value ? BigInt(data.value) : undefined,
        data: data.data,
        gasLimit: data.gasLimit ? BigInt(data.gasLimit) : undefined,
        gasPrice: data.gasPrice ? BigInt(data.gasPrice) : undefined,
      });

      return NextResponse.json(validation);
    }

    if (action === "process") {
      const data = processTransactionSchema.parse(body);

      // Validate transaction signature
      if (!metamaskAdapter.validateTransactionSignature(data, data.from)) {
        return NextResponse.json(
          { error: "Invalid transaction signature" },
          { status: 400 }
        );
      }

      // Process the MetaMask-signed transaction
      const result = await ethereumDLTService.processMetaMaskTransaction({
        rawTransaction: data.rawTransaction,
        transactionHash: data.transactionHash,
        from: data.from,
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Transaction failed" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        transactionHash: result.txHash,
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
      { error: error.message || "Failed to process request" },
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
    const txHash = searchParams.get("txHash");
    const address = searchParams.get("address");

    if (txHash) {
      // Get transaction status
      const receipt = await ethereumDLTService.getTransactionReceipt(txHash);
      
      if (!receipt) {
        return NextResponse.json(
          { error: "Transaction not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? "SUCCESS" : "FAILED",
        gasUsed: receipt.gasUsed.toString(),
        confirmed: true,
      });
    }

    if (address) {
      // Get account balance
      if (!metamaskAdapter.isValidAddress(address)) {
        return NextResponse.json(
          { error: "Invalid address" },
          { status: 400 }
        );
      }

      const balance = await ethereumDLTService.getBalance(address);
      const networkInfo = await ethereumDLTService.getNetworkInfo();

      return NextResponse.json({
        address,
        balance: balance.toString(),
        balanceETH: metamaskAdapter.weiToEth(balance),
        network: networkInfo,
      });
    }

    // Get network information
    const networkInfo = await ethereumDLTService.getNetworkInfo();
    return NextResponse.json(networkInfo);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get information" },
      { status: 500 }
    );
  }
}
