/**
 * Ethereum DLT Service
 * Direct Ethereum blockchain interactions for AbilityPay
 * 
 * This service handles:
 * - Direct blockchain transactions
 * - MetaMask-signed transaction processing
 * - Transaction monitoring and confirmation
 * - Event listening
 * - Gas estimation and optimization
 */

import type { TokenRules, TransactionResult } from "../types";
import { EthereumBlockchainAdapter } from "./ethereum-adapter";
import type { MetaMaskSignedTransaction } from "../wallet/metamask-adapter";

export interface EthereumTransactionRequest {
  from: string;
  to: string;
  value?: bigint; // Amount in wei
  data?: string; // Contract call data
  gasLimit?: bigint;
  gasPrice?: bigint;
  nonce?: number;
}

export interface EthereumTransactionReceipt {
  transactionHash: string;
  blockNumber: number;
  blockHash: string;
  gasUsed: bigint;
  status: number; // 1 = success, 0 = failure
  logs: Array<{
    address: string;
    topics: string[];
    data: string;
  }>;
  contractAddress?: string;
}

export interface EthereumEventFilter {
  address?: string;
  topics?: string[];
  fromBlock?: number;
  toBlock?: number;
}

export class EthereumDLTService {
  private adapter: EthereumBlockchainAdapter;
  private provider: any; // ethers.Provider
  private contract: any; // ethers.Contract

  constructor(config: {
    networkUrl: string;
    contractAddress?: string;
    privateKey?: string;
  }) {
    this.adapter = new EthereumBlockchainAdapter({
      networkUrl: config.networkUrl,
      privateKey: config.privateKey,
      contractAddress: config.contractAddress,
    });
    this.initializeContract();
  }

  /**
   * Initialize contract instance
   */
  private async initializeContract() {
    try {
      const { ethers } = await import("ethers");
      const networkUrl = process.env.ETHEREUM_RPC_URL || process.env.BLOCKCHAIN_NETWORK_URL || "";
      
      if (!networkUrl) {
        throw new Error("Ethereum RPC URL not configured");
      }

      this.provider = new ethers.JsonRpcProvider(networkUrl);
      
      const contractAddress = process.env.ETHEREUM_CONTRACT_ADDRESS || process.env.BLOCKCHAIN_CONTRACT_ADDRESS;
      if (contractAddress) {
        const TOKEN_VOUCHER_ABI = [
          "function mint(address recipient, uint256 amount, tuple(string authorizedSpender, string[] eligibleServices, string[] eligibleProviders, uint256 maxAmount, uint256 validFrom, uint256 validUntil, string categoryCode) rules) returns (uint256 tokenId)",
          "function transfer(address to, uint256 amount) returns (bool)",
          "function balanceOf(address account) view returns (uint256)",
          "function getTokenRules(uint256 tokenId) view returns (tuple(string authorizedSpender, string[] eligibleServices, string[] eligibleProviders, uint256 maxAmount, uint256 validFrom, uint256 validUntil, string categoryCode))",
          "function validateSpend(uint256 tokenId, string serviceCode, address providerId, uint256 amount) view returns (bool)",
          "event Transfer(address indexed from, address indexed to, uint256 value)",
          "event TokenMinted(uint256 indexed tokenId, address indexed recipient, uint256 amount)",
          "event PaymentProcessed(address indexed from, address indexed to, uint256 amount, string transactionId)"
        ];
        
        this.contract = new ethers.Contract(
          contractAddress,
          TOKEN_VOUCHER_ABI,
          this.provider
        );
      }
    } catch (error: any) {
      console.error("Failed to initialize Ethereum DLT service:", error.message);
    }
  }

  /**
   * Process a MetaMask-signed transaction
   * This validates and broadcasts a transaction signed by MetaMask
   */
  async processMetaMaskTransaction(
    signedTx: MetaMaskSignedTransaction
  ): Promise<TransactionResult> {
    try {
      const { ethers } = await import("ethers");
      
      // Broadcast the signed transaction
      const txResponse = await this.provider.broadcastTransaction(
        signedTx.rawTransaction
      );

      // Wait for transaction to be mined
      const receipt = await txResponse.wait();

      return {
        success: receipt.status === 1,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        error: receipt.status === 0 ? "Transaction reverted" : undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        txHash: signedTx.transactionHash,
        error: error.message,
      };
    }
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(request: EthereumTransactionRequest): Promise<bigint> {
    try {
      const estimate = await this.provider.estimateGas({
        from: request.from,
        to: request.to,
        value: request.value,
        data: request.data,
      });
      return BigInt(estimate.toString());
    } catch (error: any) {
      // Return default estimate if estimation fails
      return request.data && request.data !== "0x" ? 100000n : 21000n;
    }
  }

  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<bigint> {
    try {
      const feeData = await this.provider.getFeeData();
      return feeData.gasPrice || BigInt("20000000000"); // Default 20 gwei
    } catch (error) {
      return BigInt("20000000000"); // Default 20 gwei
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash: string): Promise<EthereumTransactionReceipt | null> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        return null;
      }

      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        gasUsed: BigInt(receipt.gasUsed.toString()),
        status: receipt.status,
        logs: receipt.logs.map((log: any) => ({
          address: log.address,
          topics: log.topics,
          data: log.data,
        })),
        contractAddress: receipt.contractAddress,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForConfirmation(
    txHash: string,
    confirmations: number = 1,
    timeout: number = 300000 // 5 minutes
  ): Promise<EthereumTransactionReceipt> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const receipt = await this.getTransactionReceipt(txHash);
      
      if (receipt) {
        // Check if we have enough confirmations
        const currentBlock = await this.provider.getBlockNumber();
        if (currentBlock - receipt.blockNumber >= confirmations) {
          return receipt;
        }
      }
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds
    }
    
    throw new Error("Transaction confirmation timeout");
  }

  /**
   * Get account balance (ETH)
   */
  async getBalance(address: string): Promise<bigint> {
    try {
      const balance = await this.provider.getBalance(address);
      return BigInt(balance.toString());
    } catch (error: any) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  /**
   * Get token balance from contract
   */
  async getTokenBalance(contractAddress: string, address: string): Promise<bigint> {
    try {
      if (!this.contract || this.contract.target !== contractAddress) {
        const { ethers } = await import("ethers");
        const TOKEN_VOUCHER_ABI = [
          "function balanceOf(address account) view returns (uint256)"
        ];
        const contract = new ethers.Contract(
          contractAddress,
          TOKEN_VOUCHER_ABI,
          this.provider
        );
        const balance = await contract.balanceOf(address);
        return BigInt(balance.toString());
      }
      
      const balance = await this.contract.balanceOf(address);
      return BigInt(balance.toString());
    } catch (error: any) {
      throw new Error(`Failed to get token balance: ${error.message}`);
    }
  }

  /**
   * Listen for contract events
   */
  async listenForEvents(
    filter: EthereumEventFilter,
    callback: (event: any) => void
  ): Promise<void> {
    if (!this.contract) {
      throw new Error("Contract not initialized");
    }

    try {
      this.contract.on(filter, callback);
    } catch (error: any) {
      throw new Error(`Failed to listen for events: ${error.message}`);
    }
  }

  /**
   * Stop listening for events
   */
  async stopListening(): Promise<void> {
    if (this.contract) {
      this.contract.removeAllListeners();
    }
  }

  /**
   * Get past events
   */
  async getPastEvents(
    eventName: string,
    filter: EthereumEventFilter,
    fromBlock?: number,
    toBlock?: number
  ): Promise<any[]> {
    if (!this.contract) {
      throw new Error("Contract not initialized");
    }

    try {
      const events = await this.contract.queryFilter(
        this.contract.filters[eventName](),
        fromBlock || 0,
        toBlock || "latest"
      );
      return events;
    } catch (error: any) {
      throw new Error(`Failed to get past events: ${error.message}`);
    }
  }

  /**
   * Get current block number
   */
  async getCurrentBlockNumber(): Promise<number> {
    try {
      return await this.provider.getBlockNumber();
    } catch (error: any) {
      throw new Error(`Failed to get block number: ${error.message}`);
    }
  }

  /**
   * Get block information
   */
  async getBlock(blockNumber: number | string): Promise<any> {
    try {
      return await this.provider.getBlock(blockNumber);
    } catch (error: any) {
      throw new Error(`Failed to get block: ${error.message}`);
    }
  }

  /**
   * Validate transaction before submission
   */
  async validateTransaction(request: EthereumTransactionRequest): Promise<{
    valid: boolean;
    errors: string[];
    gasEstimate?: bigint;
    gasPrice?: bigint;
  }> {
    const errors: string[] = [];

    // Validate addresses
    if (!/^0x[a-fA-F0-9]{40}$/.test(request.from)) {
      errors.push("Invalid from address");
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(request.to)) {
      errors.push("Invalid to address");
    }

    // Check balance if sending ETH
    if (request.value && request.value > 0n) {
      try {
        const balance = await this.getBalance(request.from);
        const gasEstimate = request.gasLimit || await this.estimateGas(request);
        const gasPrice = request.gasPrice || await this.getGasPrice();
        const totalCost = request.value + (gasEstimate * gasPrice);

        if (balance < totalCost) {
          errors.push("Insufficient balance for transaction");
        }
      } catch (error: any) {
        errors.push(`Balance check failed: ${error.message}`);
      }
    }

    // Estimate gas
    let gasEstimate: bigint | undefined;
    let gasPrice: bigint | undefined;
    try {
      gasEstimate = await this.estimateGas(request);
      gasPrice = await this.getGasPrice();
    } catch (error: any) {
      errors.push(`Gas estimation failed: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      gasEstimate,
      gasPrice,
    };
  }

  /**
   * Get network information
   */
  async getNetworkInfo(): Promise<{
    chainId: number;
    name: string;
    blockNumber: number;
  }> {
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      
      return {
        chainId: Number(network.chainId),
        name: network.name,
        blockNumber,
      };
    } catch (error: any) {
      throw new Error(`Failed to get network info: ${error.message}`);
    }
  }
}
