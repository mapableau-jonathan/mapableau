/**
 * Smart Contract Management Service
 * Manages smart contract deployment, ABI management, and event listening
 */

import type { BlockchainAdapter } from "./blockchain/adapter";
import { EthereumBlockchainAdapter } from "./blockchain/ethereum-adapter";
import { PolygonBlockchainAdapter } from "./blockchain/polygon-adapter";
import { HyperledgerBlockchainAdapter } from "./blockchain/hyperledger-adapter";
import { MockBlockchainAdapter } from "./blockchain/mock-adapter";
import { logger } from "@/lib/logger";

export interface ContractConfig {
  chain: "ethereum" | "polygon" | "hyperledger" | "mock";
  networkUrl: string;
  privateKey?: string;
  contractAddress?: string;
}

export interface ContractEvent {
  eventName: string;
  blockNumber: number;
  transactionHash: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export class SmartContractService {
  private adapter: BlockchainAdapter;
  private contractAddress?: string;
  private eventListeners: Map<string, Array<(event: ContractEvent) => void>> =
    new Map();

  constructor(config: ContractConfig) {
    switch (config.chain) {
      case "ethereum":
        this.adapter = new EthereumBlockchainAdapter({
          networkUrl: config.networkUrl,
          privateKey: config.privateKey,
          contractAddress: config.contractAddress,
        });
        break;
      case "polygon":
        this.adapter = new PolygonBlockchainAdapter({
          networkUrl: config.networkUrl,
          privateKey: config.privateKey,
          contractAddress: config.contractAddress,
        });
        break;
      case "hyperledger":
        this.adapter = new HyperledgerBlockchainAdapter({
          networkUrl: config.networkUrl,
          privateKey: config.privateKey,
          contractAddress: config.contractAddress,
        });
        break;
      case "mock":
      default:
        this.adapter = new MockBlockchainAdapter();
        break;
    }

    this.contractAddress = config.contractAddress;
  }

  /**
   * Deploy smart contract
   */
  async deployContract(contractBytecode: string): Promise<string> {
    try {
      const address = await this.adapter.deployContract(contractBytecode);
      this.contractAddress = address;

      logger.info("Smart contract deployed", {
        address,
        chain: this.getChainName(),
      });

      return address;
    } catch (error) {
      logger.error("Failed to deploy smart contract", error);
      throw error;
    }
  }

  /**
   * Mint token with rules
   */
  async mintToken(
    recipient: string,
    amount: bigint,
    rules: any
  ): Promise<string> {
    if (!this.contractAddress) {
      throw new Error("Contract address not set");
    }

    try {
      const txHash = await this.adapter.mintToken(
        this.contractAddress,
        recipient,
        amount,
        rules
      );

      logger.info("Token minted", {
        recipient,
        amount: amount.toString(),
        txHash,
      });

      return txHash;
    } catch (error) {
      logger.error("Failed to mint token", error);
      throw error;
    }
  }

  /**
   * Transfer tokens
   */
  async transferToken(
    from: string,
    to: string,
    amount: bigint
  ): Promise<string> {
    if (!this.contractAddress) {
      throw new Error("Contract address not set");
    }

    try {
      const txHash = await this.adapter.transferToken(
        this.contractAddress,
        from,
        to,
        amount
      );

      logger.info("Token transferred", {
        from,
        to,
        amount: amount.toString(),
        txHash,
      });

      return txHash;
    } catch (error) {
      logger.error("Failed to transfer token", error);
      throw error;
    }
  }

  /**
   * Get token balance
   */
  async getTokenBalance(address: string): Promise<bigint> {
    if (!this.contractAddress) {
      throw new Error("Contract address not set");
    }

    return await this.adapter.getTokenBalance(this.contractAddress, address);
  }

  /**
   * Validate transaction
   */
  async validateTransaction(txHash: string) {
    return await this.adapter.validateTransaction(txHash);
  }

  /**
   * Get token rules
   */
  async getTokenRules(tokenId: string) {
    if (!this.contractAddress) {
      throw new Error("Contract address not set");
    }

    return await this.adapter.getTokenRules(this.contractAddress, tokenId);
  }

  /**
   * Listen for contract events
   */
  async listenForEvents(
    eventName: string,
    callback: (event: ContractEvent) => void
  ) {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, []);
    }

    this.eventListeners.get(eventName)!.push(callback);

    // In production, this would set up actual event listeners
    // For now, this is a placeholder
    logger.info("Event listener registered", { eventName });
  }

  /**
   * Stop listening for events
   */
  stopListening(eventName: string) {
    this.eventListeners.delete(eventName);
    logger.info("Event listener removed", { eventName });
  }

  /**
   * Get chain name
   */
  private getChainName(): string {
    if (this.adapter instanceof EthereumBlockchainAdapter) return "Ethereum";
    if (this.adapter instanceof PolygonBlockchainAdapter) return "Polygon";
    if (this.adapter instanceof HyperledgerBlockchainAdapter)
      return "Hyperledger";
    return "Mock";
  }

  /**
   * Check connection status
   */
  async isConnected(): Promise<boolean> {
    return await this.adapter.isConnected();
  }
}
