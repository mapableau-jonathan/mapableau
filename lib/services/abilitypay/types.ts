/**
 * AbilityPay Types
 * Core type definitions for the blockchain-based NDIS payment system
 */

export interface TokenRules {
  authorizedSpender: string; // Participant or plan manager address
  eligibleServices: string[]; // NDIS service codes
  eligibleProviders: string[]; // Provider addresses (empty = any registered)
  maxAmount: bigint; // Maximum per transaction
  validFrom: number; // Timestamp
  validUntil: number; // Timestamp
  categoryCode: string; // NDIS support category
}

export interface TransactionResult {
  success: boolean;
  txHash: string;
  blockNumber?: number;
  gasUsed?: bigint;
  error?: string;
}

export interface TokenBalance {
  tokenId: string;
  balance: bigint;
  address: string;
}

export type BlockchainProvider = "ethereum" | "hyperledger" | "polygon" | "mock" | "payment-network";

export interface BlockchainConfig {
  provider: BlockchainProvider;
  networkUrl?: string;
  privateKey?: string;
  contractAddress?: string;
  chainId?: number;
}

/**
 * Blockchain adapter configuration
 * Used when creating blockchain adapters
 */
export interface BlockchainAdapterConfig {
  provider: BlockchainProvider;
  networkUrl?: string;
  privateKey?: string;
  contractAddress?: string;
  networkConfig?: any; // For Hyperledger
  wallet?: any; // For Hyperledger
  gateway?: any; // For Hyperledger
}
