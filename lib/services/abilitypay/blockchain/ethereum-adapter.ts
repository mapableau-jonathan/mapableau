/**
 * Ethereum Blockchain Adapter
 * Implementation using ethers.js for Ethereum networks
 * 
 * Note: This adapter requires ethers.js to be installed:
 * npm install ethers
 * 
 * The smart contract should implement the following interface:
 * - mint(address recipient, uint256 amount, TokenRules rules) returns (uint256 tokenId)
 * - transfer(address to, uint256 amount) returns (bool)
 * - balanceOf(address account) returns (uint256)
 * - getTokenRules(uint256 tokenId) returns (TokenRules)
 * - validateSpend(uint256 tokenId, string serviceCode, address providerId, uint256 amount) returns (bool)
 */

import type { BlockchainAdapter } from "./adapter";
import type { TokenRules, TransactionResult } from "../types";

// Contract ABI (simplified - actual ABI would be generated from Solidity contract)
const TOKEN_VOUCHER_ABI = [
  "function mint(address recipient, uint256 amount, tuple(string authorizedSpender, string[] eligibleServices, string[] eligibleProviders, uint256 maxAmount, uint256 validFrom, uint256 validUntil, string categoryCode) rules) returns (uint256 tokenId)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function getTokenRules(uint256 tokenId) view returns (tuple(string authorizedSpender, string[] eligibleServices, string[] eligibleProviders, uint256 maxAmount, uint256 validFrom, uint256 validUntil, string categoryCode))",
  "function validateSpend(uint256 tokenId, string serviceCode, address providerId, uint256 amount) view returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event TokenMinted(uint256 indexed tokenId, address indexed recipient, uint256 amount)"
];

export class EthereumBlockchainAdapter implements BlockchainAdapter {
  private networkUrl: string;
  private privateKey?: string;
  private contractAddress?: string;
  private provider: any; // ethers.Provider
  private signer: any; // ethers.Signer
  private contract: any; // ethers.Contract
  private connected = false;

  constructor(config: {
    networkUrl: string;
    privateKey?: string;
    contractAddress?: string;
  }) {
    this.networkUrl = config.networkUrl;
    this.privateKey = config.privateKey;
    this.contractAddress = config.contractAddress;
    this.initializeProvider();
  }

  /**
   * Initialize ethers.js provider and signer
   */
  private async initializeProvider() {
    try {
      // Dynamic import to avoid requiring ethers.js at build time
      const { ethers } = await import("ethers");
      
      // Create provider
      this.provider = new ethers.JsonRpcProvider(this.networkUrl);
      
      // Create signer if private key is provided
      if (this.privateKey) {
        this.signer = new ethers.Wallet(this.privateKey, this.provider);
      } else {
        this.signer = this.provider;
      }
      
      // Create contract instance if address is provided
      if (this.contractAddress) {
        this.contract = new ethers.Contract(
          this.contractAddress,
          TOKEN_VOUCHER_ABI,
          this.signer
        );
      }
      
      // Test connection
      const blockNumber = await this.provider.getBlockNumber();
      this.connected = blockNumber > 0;
    } catch (error: any) {
      console.error("Failed to initialize Ethereum provider:", error.message);
      this.connected = false;
      // In development, allow fallback to mock behavior
      if (process.env.NODE_ENV === "development") {
        console.warn("Ethereum adapter falling back to mock mode");
      } else {
        throw new Error(`Failed to connect to Ethereum network: ${error.message}`);
      }
    }
  }

  async deployContract(contractCode: string): Promise<string> {
    if (!this.signer || !this.privateKey) {
      throw new Error("Private key required for contract deployment");
    }

    try {
      const { ethers } = await import("ethers");
      
      // Deploy contract from bytecode
      const factory = new ethers.ContractFactory(
        TOKEN_VOUCHER_ABI,
        contractCode, // This should be the contract bytecode
        this.signer
      );
      
      const contract = await factory.deploy();
      await contract.waitForDeployment();
      
      const address = await contract.getAddress();
      this.contractAddress = address;
      this.contract = contract;
      
      return address;
    } catch (error: any) {
      throw new Error(`Contract deployment failed: ${error.message}`);
    }
  }

  async mintToken(
    contractAddress: string,
    recipient: string,
    amount: bigint,
    rules: TokenRules
  ): Promise<string> {
    if (!this.contract) {
      await this.initializeProvider();
      if (contractAddress !== this.contractAddress) {
        const { ethers } = await import("ethers");
        this.contract = new ethers.Contract(
          contractAddress,
          TOKEN_VOUCHER_ABI,
          this.signer
        );
        this.contractAddress = contractAddress;
      }
    }

    try {
      // Encode rules struct
      const rulesStruct = [
        rules.authorizedSpender,
        rules.eligibleServices,
        rules.eligibleProviders,
        rules.maxAmount,
        rules.validFrom,
        rules.validUntil,
        rules.categoryCode,
      ];

      // Call mint function
      const tx = await this.contract.mint(recipient, amount, rulesStruct);
      const receipt = await tx.wait();
      
      return receipt.hash;
    } catch (error: any) {
      throw new Error(`Token minting failed: ${error.message}`);
    }
  }

  async transferToken(
    contractAddress: string,
    from: string,
    to: string,
    amount: bigint
  ): Promise<string> {
    if (!this.contract || contractAddress !== this.contractAddress) {
      await this.initializeProvider();
      const { ethers } = await import("ethers");
      this.contract = new ethers.Contract(
        contractAddress,
        TOKEN_VOUCHER_ABI,
        this.signer
      );
      this.contractAddress = contractAddress;
    }

    try {
      // Note: In a real implementation, 'from' would need to sign the transaction
      // For now, we assume the signer is authorized to transfer on behalf of 'from'
      const tx = await this.contract.transfer(to, amount);
      const receipt = await tx.wait();
      
      return receipt.hash;
    } catch (error: any) {
      throw new Error(`Token transfer failed: ${error.message}`);
    }
  }

  async getTokenBalance(
    contractAddress: string,
    address: string
  ): Promise<bigint> {
    if (!this.contract || contractAddress !== this.contractAddress) {
      await this.initializeProvider();
      const { ethers } = await import("ethers");
      this.contract = new ethers.Contract(
        contractAddress,
        TOKEN_VOUCHER_ABI,
        this.provider // Use provider for read-only calls
      );
      this.contractAddress = contractAddress;
    }

    try {
      const balance = await this.contract.balanceOf(address);
      return BigInt(balance.toString());
    } catch (error: any) {
      throw new Error(`Balance query failed: ${error.message}`);
    }
  }

  async validateTransaction(txHash: string): Promise<TransactionResult> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        return {
          success: false,
          txHash,
          error: "Transaction not found",
        };
      }

      return {
        success: receipt.status === 1,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: BigInt(receipt.gasUsed.toString()),
        error: receipt.status === 0 ? "Transaction reverted" : undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        txHash,
        error: error.message,
      };
    }
  }

  async getTokenRules(
    contractAddress: string,
    tokenId: string
  ): Promise<TokenRules> {
    if (!this.contract || contractAddress !== this.contractAddress) {
      await this.initializeProvider();
      const { ethers } = await import("ethers");
      this.contract = new ethers.Contract(
        contractAddress,
        TOKEN_VOUCHER_ABI,
        this.provider
      );
      this.contractAddress = contractAddress;
    }

    try {
      const rules = await this.contract.getTokenRules(tokenId);
      
      return {
        authorizedSpender: rules.authorizedSpender,
        eligibleServices: rules.eligibleServices,
        eligibleProviders: rules.eligibleProviders,
        maxAmount: BigInt(rules.maxAmount.toString()),
        validFrom: Number(rules.validFrom),
        validUntil: Number(rules.validUntil),
        categoryCode: rules.categoryCode,
      };
    } catch (error: any) {
      throw new Error(`Rules retrieval failed: ${error.message}`);
    }
  }

  async isConnected(): Promise<boolean> {
    if (!this.connected) {
      try {
        await this.initializeProvider();
      } catch (error) {
        return false;
      }
    }
    
    try {
      await this.provider.getBlockNumber();
      return true;
    } catch (error) {
      this.connected = false;
      return false;
    }
  }
}
