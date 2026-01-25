/**
 * RPC MainNet API
 * JSON-RPC 2.0 endpoint for Payment Node Network
 * 
 * POST /api/abilitypay/rpc
 */

import { NextRequest, NextResponse } from "next/server";
import { RPCServer } from "@/lib/services/abilitypay/network/rpc-server";
import { EthereumRPC } from "@/lib/services/abilitypay/network/rpc/ethereum-methods";
import { AbilityPayRPC } from "@/lib/services/abilitypay/network/rpc/abilitypay-methods";
import { logger } from "@/lib/logger";
import { apiRateLimit } from "@/lib/security/rate-limit";

// Initialize RPC server
const rpcServer = new RPCServer();
const ethereumRPC = new EthereumRPC("0x1"); // MainNet
const abilityPayRPC = new AbilityPayRPC();

// Register Ethereum methods
rpcServer.registerMethod("eth_blockNumber", () => ethereumRPC.eth_blockNumber());
rpcServer.registerMethod("eth_getBalance", (params) => ethereumRPC.eth_getBalance(params[0], params[1]));
rpcServer.registerMethod("eth_sendTransaction", (params) => ethereumRPC.eth_sendTransaction(params[0]));
rpcServer.registerMethod("eth_getTransactionReceipt", (params) => ethereumRPC.eth_getTransactionReceipt(params[0]));
rpcServer.registerMethod("eth_getBlockByNumber", (params) => ethereumRPC.eth_getBlockByNumber(params[0], params[1]));
rpcServer.registerMethod("eth_call", (params) => ethereumRPC.eth_call(params[0], params[1]));
rpcServer.registerMethod("eth_estimateGas", (params) => ethereumRPC.eth_estimateGas(params[0]));
rpcServer.registerMethod("net_version", () => ethereumRPC.net_version());
rpcServer.registerMethod("net_peerCount", () => ethereumRPC.net_peerCount());

// Register AbilityPay methods
rpcServer.registerMethod("abilitypay_getNDISPlan", (params) => abilityPayRPC.abilitypay_getNDISPlan(params[0]));
rpcServer.registerMethod("abilitypay_getTokenVouchers", (params) => abilityPayRPC.abilitypay_getTokenVouchers(params[0]));
rpcServer.registerMethod("abilitypay_getPaymentHistory", (params) => abilityPayRPC.abilitypay_getPaymentHistory(params[0], params[1]));
rpcServer.registerMethod("abilitypay_validatePayment", (params) => abilityPayRPC.abilitypay_validatePayment(params[0]));
rpcServer.registerMethod("abilitypay_getProviderStatus", (params) => abilityPayRPC.abilitypay_getProviderStatus(params[0]));
rpcServer.registerMethod("abilitypay_getNetworkStatus", () => abilityPayRPC.abilitypay_getNetworkStatus());
rpcServer.registerMethod("abilitypay_getQualityRating", (params) => abilityPayRPC.abilitypay_getQualityRating(params[0], params[1]));
rpcServer.registerMethod("abilitypay_getSafeguardingBenchmark", (params) => abilityPayRPC.abilitypay_getSafeguardingBenchmark(params[0], params[1]));
rpcServer.registerMethod("abilitypay_submitQualityRating", (params) => abilityPayRPC.abilitypay_submitQualityRating(params[0]));
rpcServer.registerMethod("abilitypay_submitSafeguardingUpdate", (params) => abilityPayRPC.abilitypay_submitSafeguardingUpdate(params[0]));
rpcServer.registerMethod("abilitypay_getQualityHistory", (params) => abilityPayRPC.abilitypay_getQualityHistory(params[0], params[1]));
rpcServer.registerMethod("abilitypay_getSafeguardingHistory", (params) => abilityPayRPC.abilitypay_getSafeguardingHistory(params[0], params[1]));

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = await apiRateLimit(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await request.json();

    // Handle batch request
    if (Array.isArray(body)) {
      const responses = await rpcServer.handleBatchRequest(body);
      return NextResponse.json(responses);
    }

    // Handle single request
    const response = await rpcServer.handleRequest(body);
    return NextResponse.json(response);
  } catch (error: any) {
    logger.error("RPC request error", error);
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: "Parse error",
          data: error.message || "Invalid JSON",
        },
      },
      { status: 400 }
    );
  }
}

// List available methods
export async function GET(request: NextRequest) {
  return NextResponse.json({
    methods: rpcServer.listMethods(),
    network: "abilitypay-mainnet",
    version: "1.0.0",
  });
}
