/**
 * MetaMask Wallet Adapter
 * Integration with MetaMask browser extension for Ethereum wallet operations
 * 
 * This adapter handles:
 * - Wallet connection/disconnection
 * - Account detection
 * - Transaction signing
 * - Network switching
 * - Balance queries
 * 
 * Note: MetaMask operations are client-side only. This adapter provides
 * server-side utilities and validation for MetaMask-signed transactions.
 */

import type { TokenRules, TransactionResult } from "../types";

export interface MetaMaskAccount {
  address: string;
  balance: string; // ETH balance in wei (as string to avoid precision loss)
  chainId: number;
  networkName: string;
}

export interface MetaMaskTransaction {
  to: string; // Contract address or recipient
  value?: string; // Amount in wei (hex string)
  data?: string; // Contract call data (hex string)
  gasPrice?: string; // Gas price in wei (hex string)
  gasLimit?: string; // Gas limit (hex string)
  nonce?: number;
}

export interface MetaMaskSignedTransaction {
  rawTransaction: string; // Signed transaction hex
  transactionHash: string; // Transaction hash
  from: string; // Sender address
}

export interface MetaMaskConnectionResult {
  connected: boolean;
  accounts: string[];
  chainId: number;
  networkName: string;
}

export interface MetaMaskNetworkConfig {
  chainId: number;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

/**
 * Server-side MetaMask adapter
 * Validates and processes MetaMask-signed transactions
 */
export class MetaMaskAdapter {
  private defaultNetwork: MetaMaskNetworkConfig;
  private contractAddress?: string;
  private contractABI?: any[];

  constructor(config?: {
    defaultNetwork?: MetaMaskNetworkConfig;
    contractAddress?: string;
    contractABI?: any[];
  }) {
    this.defaultNetwork = config?.defaultNetwork || this.getDefaultEthereumMainnet();
    this.contractAddress = config?.contractAddress || process.env.ETHEREUM_CONTRACT_ADDRESS;
    this.contractABI = config?.contractABI;
  }

  /**
   * Get default Ethereum mainnet configuration
   */
  private getDefaultEthereumMainnet(): MetaMaskNetworkConfig {
    return {
      chainId: 1,
      chainName: "Ethereum Mainnet",
      nativeCurrency: {
        name: "Ether",
        symbol: "ETH",
        decimals: 18,
      },
      rpcUrls: ["https://mainnet.infura.io/v3/YOUR_PROJECT_ID"],
      blockExplorerUrls: ["https://etherscan.io"],
    };
  }

  /**
   * Get Ethereum testnet configuration
   */
  getEthereumTestnetConfig(): MetaMaskNetworkConfig {
    return {
      chainId: 11155111, // Sepolia testnet
      chainName: "Sepolia Testnet",
      nativeCurrency: {
        name: "Ether",
        symbol: "ETH",
        decimals: 18,
      },
      rpcUrls: ["https://sepolia.infura.io/v3/YOUR_PROJECT_ID"],
      blockExplorerUrls: ["https://sepolia.etherscan.io"],
    };
  }

  /**
   * Get Polygon network configuration
   */
  getPolygonConfig(): MetaMaskNetworkConfig {
    return {
      chainId: 137,
      chainName: "Polygon Mainnet",
      nativeCurrency: {
        name: "MATIC",
        symbol: "MATIC",
        decimals: 18,
      },
      rpcUrls: ["https://polygon-rpc.com"],
      blockExplorerUrls: ["https://polygonscan.com"],
    };
  }

  /**
   * Validate Ethereum address format
   */
  isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Validate transaction signature
   * Note: This is a simplified validation. Full signature verification
   * would require recovering the signer address from the signature.
   */
  validateTransactionSignature(
    transaction: MetaMaskSignedTransaction,
    expectedFrom: string
  ): boolean {
    if (!this.isValidAddress(transaction.from)) {
      return false;
    }

    if (transaction.from.toLowerCase() !== expectedFrom.toLowerCase()) {
      return false;
    }

    if (!transaction.rawTransaction || !transaction.transactionHash) {
      return false;
    }

    // Basic format validation
    return /^0x[a-fA-F0-9]+$/.test(transaction.rawTransaction) &&
           /^0x[a-fA-F0-9]{64}$/.test(transaction.transactionHash);
  }

  /**
   * Encode token transfer function call
   * For ERC-20 or custom token contract
   */
  encodeTransferFunction(
    to: string,
    amount: bigint,
    contractABI?: any[]
  ): string {
    // Standard ERC-20 transfer function signature
    // transfer(address to, uint256 amount)
    const functionSignature = "0xa9059cbb";
    
    // Encode parameters
    const toAddress = to.slice(2).padStart(64, "0");
    const amountHex = amount.toString(16).padStart(64, "0");
    
    return functionSignature + toAddress + amountHex;
  }

  /**
   * Encode token mint function call with rules
   */
  encodeMintFunction(
    recipient: string,
    amount: bigint,
    rules: TokenRules,
    contractABI?: any[]
  ): string {
    // Custom mint function with rules
    // mint(address recipient, uint256 amount, TokenRules rules)
    // This would need to match your smart contract ABI
    
    // For now, return a placeholder - actual encoding depends on contract
    const functionSignature = "0x40c10f19"; // Example signature
    
    const recipientEncoded = recipient.slice(2).padStart(64, "0");
    const amountEncoded = amount.toString(16).padStart(64, "0");
    
    // Rules encoding would be more complex (struct encoding)
    // This is a simplified version
    return functionSignature + recipientEncoded + amountEncoded;
  }

  /**
   * Calculate gas estimate for transaction
   */
  async estimateGas(
    transaction: MetaMaskTransaction,
    rpcUrl?: string
  ): Promise<bigint> {
    // In a real implementation, this would call eth_estimateGas RPC
    // For now, return a default estimate
    
    const defaultGasLimit = 21000n; // Standard ETH transfer
    const contractCallGas = 100000n; // Contract call estimate
    
    if (transaction.data && transaction.data !== "0x") {
      return contractCallGas;
    }
    
    return defaultGasLimit;
  }

  /**
   * Get current gas price
   */
  async getGasPrice(rpcUrl?: string): Promise<bigint> {
    // In a real implementation, this would call eth_gasPrice RPC
    // For now, return a default estimate (20 gwei)
    return BigInt("20000000000"); // 20 gwei
  }

  /**
   * Convert ETH amount to wei
   */
  ethToWei(ethAmount: number | string): bigint {
    const amount = typeof ethAmount === "string" ? parseFloat(ethAmount) : ethAmount;
    const weiPerEth = BigInt("1000000000000000000"); // 10^18
    return BigInt(Math.floor(amount * Number(weiPerEth)));
  }

  /**
   * Convert wei to ETH amount
   */
  weiToEth(weiAmount: bigint | string): number {
    const wei = typeof weiAmount === "string" ? BigInt(weiAmount) : weiAmount;
    const weiPerEth = BigInt("1000000000000000000"); // 10^18
    return Number(wei) / Number(weiPerEth);
  }

  /**
   * Format address for display (with checksum)
   */
  toChecksumAddress(address: string): string {
    if (!this.isValidAddress(address)) {
      throw new Error("Invalid Ethereum address");
    }

    // Simple checksum - in production, use a library like ethereumjs-util
    return address;
  }

  /**
   * Get network configuration for MetaMask
   */
  getNetworkConfig(chainId?: number): MetaMaskNetworkConfig {
    if (chainId === 1) {
      return this.getDefaultEthereumMainnet();
    }
    if (chainId === 11155111) {
      return this.getEthereumTestnetConfig();
    }
    if (chainId === 137) {
      return this.getPolygonConfig();
    }
    
    return this.defaultNetwork;
  }

  /**
   * Validate network compatibility
   */
  isNetworkSupported(chainId: number): boolean {
    const supportedNetworks = [1, 11155111, 137, 80001]; // Mainnet, Sepolia, Polygon, Mumbai
    return supportedNetworks.includes(chainId);
  }
}

/**
 * Client-side MetaMask utilities
 * These functions should be called from the browser
 */
export const MetaMaskClientUtils = {
  /**
   * Check if MetaMask is installed
   */
  isMetaMaskInstalled(): boolean {
    if (typeof window === "undefined") return false;
    return typeof (window as any).ethereum !== "undefined" &&
           (window as any).ethereum.isMetaMask;
  },

  /**
   * Request account access
   */
  async requestAccounts(): Promise<string[]> {
    if (typeof window === "undefined") {
      throw new Error("MetaMask can only be accessed in browser");
    }

    const ethereum = (window as any).ethereum;
    if (!ethereum || !ethereum.isMetaMask) {
      throw new Error("MetaMask is not installed");
    }

    try {
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });
      return accounts;
    } catch (error: any) {
      throw new Error(`Failed to connect MetaMask: ${error.message}`);
    }
  },

  /**
   * Get current accounts
   */
  async getAccounts(): Promise<string[]> {
    if (typeof window === "undefined") {
      throw new Error("MetaMask can only be accessed in browser");
    }

    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      return [];
    }

    try {
      const accounts = await ethereum.request({
        method: "eth_accounts",
      });
      return accounts;
    } catch (error) {
      return [];
    }
  },

  /**
   * Get current chain ID
   */
  async getChainId(): Promise<number> {
    if (typeof window === "undefined") {
      throw new Error("MetaMask can only be accessed in browser");
    }

    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      throw new Error("MetaMask is not installed");
    }

    try {
      const chainId = await ethereum.request({
        method: "eth_chainId",
      });
      return parseInt(chainId, 16);
    } catch (error: any) {
      throw new Error(`Failed to get chain ID: ${error.message}`);
    }
  },

  /**
   * Switch network
   */
  async switchNetwork(chainId: number): Promise<void> {
    if (typeof window === "undefined") {
      throw new Error("MetaMask can only be accessed in browser");
    }

    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      throw new Error("MetaMask is not installed");
    }

    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (error: any) {
      // If chain doesn't exist, add it
      if (error.code === 4902) {
        throw new Error("Network not added to MetaMask. Please add it manually.");
      }
      throw new Error(`Failed to switch network: ${error.message}`);
    }
  },

  /**
   * Add network to MetaMask
   */
  async addNetwork(networkConfig: MetaMaskNetworkConfig): Promise<void> {
    if (typeof window === "undefined") {
      throw new Error("MetaMask can only be accessed in browser");
    }

    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      throw new Error("MetaMask is not installed");
    }

    try {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: `0x${networkConfig.chainId.toString(16)}`,
          chainName: networkConfig.chainName,
          nativeCurrency: networkConfig.nativeCurrency,
          rpcUrls: networkConfig.rpcUrls,
          blockExplorerUrls: networkConfig.blockExplorerUrls,
        }],
      });
    } catch (error: any) {
      throw new Error(`Failed to add network: ${error.message}`);
    }
  },

  /**
   * Get account balance
   */
  async getBalance(address: string): Promise<bigint> {
    if (typeof window === "undefined") {
      throw new Error("MetaMask can only be accessed in browser");
    }

    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      throw new Error("MetaMask is not installed");
    }

    try {
      const balance = await ethereum.request({
        method: "eth_getBalance",
        params: [address, "latest"],
      });
      return BigInt(balance);
    } catch (error: any) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  },

  /**
   * Send transaction
   */
  async sendTransaction(transaction: MetaMaskTransaction): Promise<string> {
    if (typeof window === "undefined") {
      throw new Error("MetaMask can only be accessed in browser");
    }

    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      throw new Error("MetaMask is not installed");
    }

    try {
      const txHash = await ethereum.request({
        method: "eth_sendTransaction",
        params: [transaction],
      });
      return txHash;
    } catch (error: any) {
      throw new Error(`Transaction failed: ${error.message}`);
    }
  },

  /**
   * Sign message
   */
  async signMessage(message: string, address: string): Promise<string> {
    if (typeof window === "undefined") {
      throw new Error("MetaMask can only be accessed in browser");
    }

    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      throw new Error("MetaMask is not installed");
    }

    try {
      const signature = await ethereum.request({
        method: "eth_sign",
        params: [address, message],
      });
      return signature;
    } catch (error: any) {
      throw new Error(`Failed to sign message: ${error.message}`);
    }
  },
};
