/**
 * Payment Node Network Types
 * Simplified types for the payment network
 */

export interface Block {
  number: number;
  hash: string;
  previousHash: string;
  timestamp: number;
  transactions: Transaction[];
  validator: string; // Node that proposed block
  signature: string;
  merkleRoot: string;
}

export interface Transaction {
  hash: string;
  type: TransactionType;
  from: string;
  to: string;
  amount: bigint;
  data: TransactionData;
  nonce: number;
  signature: string;
  timestamp: number;
}

export type TransactionType =
  | "PAYMENT"
  | "TOKEN_MINT"
  | "TOKEN_TRANSFER"
  | "PLAN_UPDATE"
  | "NODE_REGISTRATION"
  | "QUALITY_RATING"
  | "SAFEGUARDING_UPDATE";

export interface TransactionData {
  // Payment transaction data
  planId?: string;
  participantId?: string;
  providerId?: string;
  serviceCode?: string;
  categoryId?: string;
  
  // Quality & Safeguarding data
  qualityRating?: QualityRatingData;
  safeguardingBenchmark?: SafeguardingBenchmarkData;
  
  // Token data
  tokenId?: string;
  rules?: any;
  
  // Generic metadata
  metadata?: Record<string, any>;
}

export interface QualityRatingData {
  providerId: string;
  participantId?: string;
  rating: number; // 1-5 scale
  category: string; // e.g., "service_quality", "communication", "safety"
  comment?: string;
  reviewerId: string;
  timestamp: number;
}

export interface SafeguardingBenchmarkData {
  providerId: string;
  participantId?: string;
  benchmark: string; // Benchmark identifier
  score: number; // 0-100
  criteria: Record<string, number>; // Individual criteria scores
  assessedBy: string;
  timestamp: number;
}

export interface PaymentNode {
  id: string;
  nodeId: string; // Public key identifier
  name: string;
  publicKey: string;
  endpoint: string; // RPC endpoint URL
  status: NodeStatus;
  role: NodeRole;
  stake?: bigint;
  registeredAt: Date;
  approvedAt?: Date;
  lastSeenAt?: Date;
}

export enum NodeStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  OFFLINE = "OFFLINE",
}

export enum NodeRole {
  VALIDATOR = "VALIDATOR",
  OBSERVER = "OBSERVER",
  ARCHIVE = "ARCHIVE",
}

export interface RPCRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: any[];
}

export interface RPCResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface NetworkStatus {
  blockNumber: number;
  blockHash: string;
  peerCount: number;
  transactionCount: number;
  validatorCount: number;
  networkId: string;
}
