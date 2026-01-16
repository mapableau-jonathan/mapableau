/**
 * Hyperledger Fabric Blockchain Adapter
 * Implementation for enterprise permissioned blockchain
 * 
 * Note: This adapter requires @hyperledger/fabric-gateway to be installed:
 * npm install @hyperledger/fabric-gateway
 * 
 * Hyperledger Fabric uses chaincode (smart contracts) and requires:
 * - Network configuration (connection profile)
 * - Wallet with user identity
 * - Gateway connection
 * 
 * The chaincode should implement the following functions:
 * - Mint(recipient, amount, rules) returns (tokenId)
 * - Transfer(to, amount) returns (success)
 * - GetBalance(address) returns (balance)
 * - GetTokenRules(tokenId) returns (rules)
 * - ValidateSpend(tokenId, serviceCode, providerId, amount) returns (valid)
 */

import type { BlockchainAdapter } from "./adapter";
import type { TokenRules, TransactionResult } from "../types";

export class HyperledgerBlockchainAdapter implements BlockchainAdapter {
  private networkConfig: any;
  private wallet: any;
  private gateway: any;
  private contract: any; // Chaincode contract instance
  private channelName: string;
  private chaincodeName: string;
  private connected = false;

  constructor(config: {
    networkConfig: any;
    wallet: any;
    gateway?: any;
    channelName?: string;
    chaincodeName?: string;
  }) {
    this.networkConfig = config.networkConfig;
    this.wallet = config.wallet;
    this.gateway = config.gateway;
    this.channelName = config.channelName || "abilitypay-channel";
    this.chaincodeName = config.chaincodeName || "token-voucher";
    this.initializeGateway();
  }

  /**
   * Initialize Hyperledger Fabric gateway and contract
   */
  private async initializeGateway() {
    try {
      // Dynamic import to avoid requiring fabric-gateway at build time
      const { Gateway, Wallets } = await import("@hyperledger/fabric-gateway");
      const { grpc } = await import("@hyperledger/fabric-gateway");
      
      // Create gateway if not provided
      if (!this.gateway) {
        const connection = grpc.connection(this.networkConfig);
        this.gateway = new Gateway();
        await this.gateway.connect(connection, {
          identity: this.wallet.get("admin"), // Admin identity from wallet
          discovery: { enabled: true, asLocalhost: true },
        });
      }
      
      // Get network and contract
      const network = await this.gateway.getNetwork(this.channelName);
      this.contract = network.getContract(this.chaincodeName);
      
      this.connected = true;
    } catch (error: any) {
      console.error("Failed to initialize Hyperledger gateway:", error.message);
      this.connected = false;
      if (process.env.NODE_ENV === "development") {
        console.warn("Hyperledger adapter falling back to mock mode");
      } else {
        throw new Error(`Failed to connect to Hyperledger network: ${error.message}`);
      }
    }
  }

  async deployContract(contractCode: string): Promise<string> {
    // In Hyperledger Fabric, chaincode is deployed separately via lifecycle commands
    // This method would typically package and install chaincode
    // For now, we assume chaincode is already deployed and return the chaincode name
    
    if (!this.connected) {
      await this.initializeGateway();
    }
    
    // In a real implementation, this would:
    // 1. Package the chaincode
    // 2. Install it on peers
    // 3. Approve it on the channel
    // 4. Commit it to the channel
    
    // For now, return the chaincode name as the "address"
    return this.chaincodeName;
  }

  async mintToken(
    contractAddress: string,
    recipient: string,
    amount: bigint,
    rules: TokenRules
  ): Promise<string> {
    if (!this.contract) {
      await this.initializeGateway();
    }

    try {
      // Prepare rules as JSON string (chaincode will parse)
      const rulesJson = JSON.stringify({
        authorizedSpender: rules.authorizedSpender,
        eligibleServices: rules.eligibleServices,
        eligibleProviders: rules.eligibleProviders,
        maxAmount: rules.maxAmount.toString(),
        validFrom: rules.validFrom,
        validUntil: rules.validUntil,
        categoryCode: rules.categoryCode,
      });

      // Submit transaction to chaincode
      const result = await this.contract.submitTransaction(
        "Mint",
        recipient,
        amount.toString(),
        rulesJson
      );

      // Parse result to get transaction ID
      const response = JSON.parse(result.toString());
      return response.txId || response.transactionId;
    } catch (error: any) {
      throw new Error(`Hyperledger token minting failed: ${error.message}`);
    }
  }

  async transferToken(
    contractAddress: string,
    from: string,
    to: string,
    amount: bigint
  ): Promise<string> {
    if (!this.contract) {
      await this.initializeGateway();
    }

    try {
      // Submit transfer transaction
      const result = await this.contract.submitTransaction(
        "Transfer",
        from,
        to,
        amount.toString()
      );

      // Parse result to get transaction ID
      const response = JSON.parse(result.toString());
      return response.txId || response.transactionId;
    } catch (error: any) {
      throw new Error(`Hyperledger token transfer failed: ${error.message}`);
    }
  }

  async getTokenBalance(
    contractAddress: string,
    address: string
  ): Promise<bigint> {
    if (!this.contract) {
      await this.initializeGateway();
    }

    try {
      // Evaluate (query) transaction - doesn't commit to ledger
      const result = await this.contract.evaluateTransaction(
        "GetBalance",
        address
      );

      const balance = JSON.parse(result.toString());
      return BigInt(balance.balance || balance);
    } catch (error: any) {
      throw new Error(`Hyperledger balance query failed: ${error.message}`);
    }
  }

  async validateTransaction(txHash: string): Promise<TransactionResult> {
    if (!this.contract) {
      await this.initializeGateway();
    }

    try {
      // Query transaction status from chaincode
      const result = await this.contract.evaluateTransaction(
        "GetTransaction",
        txHash
      );

      const txData = JSON.parse(result.toString());
      
      return {
        success: txData.status === "SUCCESS" || txData.status === "VALID",
        txHash: txData.txId || txHash,
        blockNumber: txData.blockNumber,
        error: txData.status === "FAILED" ? txData.error : undefined,
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
    if (!this.contract) {
      await this.initializeGateway();
    }

    try {
      // Query token rules from chaincode
      const result = await this.contract.evaluateTransaction(
        "GetTokenRules",
        tokenId
      );

      const rules = JSON.parse(result.toString());
      
      return {
        authorizedSpender: rules.authorizedSpender,
        eligibleServices: rules.eligibleServices || [],
        eligibleProviders: rules.eligibleProviders || [],
        maxAmount: BigInt(rules.maxAmount || "0"),
        validFrom: rules.validFrom,
        validUntil: rules.validUntil,
        categoryCode: rules.categoryCode,
      };
    } catch (error: any) {
      throw new Error(`Hyperledger rules retrieval failed: ${error.message}`);
    }
  }

  async isConnected(): Promise<boolean> {
    if (!this.connected) {
      try {
        await this.initializeGateway();
      } catch (error) {
        return false;
      }
    }
    
    // Test connection by querying chaincode
    try {
      await this.contract.evaluateTransaction("Ping");
      return true;
    } catch (error) {
      this.connected = false;
      return false;
    }
  }

  /**
   * Close gateway connection
   */
  async disconnect(): Promise<void> {
    if (this.gateway) {
      await this.gateway.close();
      this.connected = false;
    }
  }
}
