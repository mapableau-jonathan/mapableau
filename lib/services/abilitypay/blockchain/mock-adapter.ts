/**
 * Mock Blockchain Adapter
 * In-memory implementation for testing and development
 */

import type { BlockchainAdapter } from "./adapter";
import type { TokenRules, TransactionResult } from "../types";

interface MockToken {
  id: string;
  contractAddress: string;
  owner: string;
  amount: bigint;
  rules: TokenRules;
}

interface MockTransaction {
  hash: string;
  contractAddress: string;
  from: string;
  to: string;
  amount: bigint;
  blockNumber: number;
  timestamp: number;
  status: "pending" | "confirmed" | "failed";
}

export class MockBlockchainAdapter implements BlockchainAdapter {
  private tokens: Map<string, MockToken> = new Map();
  private transactions: Map<string, MockTransaction> = new Map();
  private contracts: Map<string, string> = new Map();
  private blockNumber = 0;
  private connected = true;

  async deployContract(contractCode: string): Promise<string> {
    const address = `0x${Math.random().toString(16).substring(2, 42)}`;
    this.contracts.set(address, contractCode);
    return address;
  }

  async mintToken(
    contractAddress: string,
    recipient: string,
    amount: bigint,
    rules: TokenRules
  ): Promise<string> {
    if (!this.contracts.has(contractAddress)) {
      throw new Error(`Contract not found: ${contractAddress}`);
    }

    const tokenId = `token_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const token: MockToken = {
      id: tokenId,
      contractAddress,
      owner: recipient,
      amount,
      rules,
    };

    this.tokens.set(tokenId, token);

    const txHash = `0x${Math.random().toString(16).substring(2, 66)}`;
    const transaction: MockTransaction = {
      hash: txHash,
      contractAddress,
      from: "0x0000000000000000000000000000000000000000", // Mint address
      to: recipient,
      amount,
      blockNumber: ++this.blockNumber,
      timestamp: Date.now(),
      status: "confirmed",
    };

    this.transactions.set(txHash, transaction);
    return txHash;
  }

  async transferToken(
    contractAddress: string,
    from: string,
    to: string,
    amount: bigint
  ): Promise<string> {
    // Find tokens owned by 'from' address
    const tokens = Array.from(this.tokens.values()).filter(
      (t) => t.contractAddress === contractAddress && t.owner === from
    );

    if (tokens.length === 0) {
      throw new Error(`No tokens found for address: ${from}`);
    }

    // Simple transfer: find first token with sufficient balance
    const token = tokens.find((t) => t.amount >= amount);
    if (!token) {
      throw new Error(`Insufficient balance for transfer`);
    }

    // Update token ownership
    token.owner = to;
    token.amount = amount;

    const txHash = `0x${Math.random().toString(16).substring(2, 66)}`;
    const transaction: MockTransaction = {
      hash: txHash,
      contractAddress,
      from,
      to,
      amount,
      blockNumber: ++this.blockNumber,
      timestamp: Date.now(),
      status: "confirmed",
    };

    this.transactions.set(txHash, transaction);
    return txHash;
  }

  async getTokenBalance(
    contractAddress: string,
    address: string
  ): Promise<bigint> {
    const tokens = Array.from(this.tokens.values()).filter(
      (t) => t.contractAddress === contractAddress && t.owner === address
    );

    return tokens.reduce((sum, token) => sum + token.amount, 0n);
  }

  async validateTransaction(txHash: string): Promise<TransactionResult> {
    const transaction = this.transactions.get(txHash);

    if (!transaction) {
      return {
        success: false,
        txHash,
        error: "Transaction not found",
      };
    }

    return {
      success: transaction.status === "confirmed",
      txHash: transaction.hash,
      blockNumber: transaction.blockNumber,
      gasUsed: 21000n, // Mock gas usage
    };
  }

  async getTokenRules(
    contractAddress: string,
    tokenId: string
  ): Promise<TokenRules> {
    const token = this.tokens.get(tokenId);

    if (!token || token.contractAddress !== contractAddress) {
      throw new Error(`Token not found: ${tokenId}`);
    }

    return token.rules;
  }

  async isConnected(): Promise<boolean> {
    return this.connected;
  }

  // Test helper methods
  setConnected(connected: boolean): void {
    this.connected = connected;
  }

  getToken(tokenId: string): MockToken | undefined {
    return this.tokens.get(tokenId);
  }

  clear(): void {
    this.tokens.clear();
    this.transactions.clear();
    this.contracts.clear();
    this.blockNumber = 0;
  }
}
