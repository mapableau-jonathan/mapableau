/**
 * Blockchain Adapter Interface
 * Abstract interface for blockchain-agnostic operations
 */

import type { TokenRules, TransactionResult } from "../types";

export interface BlockchainAdapter {
  /**
   * Deploy a smart contract to the blockchain
   * @param contractCode - Smart contract bytecode or source
   * @returns Contract address
   */
  deployContract(contractCode: string): Promise<string>;

  /**
   * Mint a new token with embedded spending rules
   * @param contractAddress - Address of the token contract
   * @param recipient - Address to receive the token
   * @param amount - Amount to mint (in smallest unit, e.g., wei)
   * @param rules - Token spending rules
   * @returns Transaction hash
   */
  mintToken(
    contractAddress: string,
    recipient: string,
    amount: bigint,
    rules: TokenRules
  ): Promise<string>;

  /**
   * Transfer tokens between addresses
   * @param contractAddress - Address of the token contract
   * @param from - Sender address
   * @param to - Recipient address
   * @param amount - Amount to transfer
   * @returns Transaction hash
   */
  transferToken(
    contractAddress: string,
    from: string,
    to: string,
    amount: bigint
  ): Promise<string>;

  /**
   * Get token balance for an address
   * @param contractAddress - Address of the token contract
   * @param address - Address to query
   * @returns Token balance
   */
  getTokenBalance(contractAddress: string, address: string): Promise<bigint>;

  /**
   * Validate a transaction on the blockchain
   * @param txHash - Transaction hash
   * @returns Transaction result with validation status
   */
  validateTransaction(txHash: string): Promise<TransactionResult>;

  /**
   * Get token rules for a specific token
   * @param contractAddress - Address of the token contract
   * @param tokenId - Token identifier
   * @returns Token rules
   */
  getTokenRules(contractAddress: string, tokenId: string): Promise<TokenRules>;

  /**
   * Check if the adapter is connected to the blockchain
   * @returns Connection status
   */
  isConnected(): Promise<boolean>;
}
