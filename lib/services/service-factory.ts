/**
 * Service Factory Pattern
 * 
 * Centralizes service instantiation and configuration using singleton pattern.
 * This ensures services are properly configured and reused across the application.
 * 
 * ## Usage
 * 
 * Instead of instantiating services directly:
 * ```typescript
 * // ❌ Don't do this
 * const paymentService = new PaymentService(config);
 * ```
 * 
 * Use the factory functions:
 * ```typescript
 * // ✅ Do this
 * import { getPaymentService } from "@/lib/services/service-factory";
 * const paymentService = getPaymentService();
 * ```
 * 
 * ## Benefits
 * - Ensures consistent configuration from environment variables
 * - Prevents multiple instances of the same service
 * - Centralizes service initialization logic
 * - Makes testing easier (can mock factory functions)
 * 
 * ## Adding New Services
 * 
 * To add a new service to the factory:
 * 1. Create a singleton instance variable
 * 2. Create a getter function that initializes the service if needed
 * 3. Use environment configuration helpers (getEnv, getBlockchainConfig, etc.)
 * 4. Document the service's configuration requirements
 */

import { PaymentService } from "./abilitypay";
import { PlanService } from "./abilitypay";
import { TokenService } from "./abilitypay";
import { RedemptionService } from "./abilitypay";
import { ValidationService } from "./abilitypay";
import { getEnv } from "@/lib/config/env";

// Singleton instances
let paymentServiceInstance: PaymentService | null = null;
let planServiceInstance: PlanService | null = null;
let tokenServiceInstance: TokenService | null = null;
let redemptionServiceInstance: RedemptionService | null = null;
let validationServiceInstance: ValidationService | null = null;

/**
 * Get blockchain configuration from environment
 */
function getBlockchainConfig() {
  const env = getEnv();
  
  return {
    provider: (env.BLOCKCHAIN_PROVIDER || "mock") as
      | "ethereum"
      | "hyperledger"
      | "polygon"
      | "mock",
    networkUrl: env.BLOCKCHAIN_NETWORK_URL,
    privateKey: env.BLOCKCHAIN_PRIVATE_KEY,
    contractAddress: env.BLOCKCHAIN_CONTRACT_ADDRESS,
  };
}

/**
 * Get payment provider configuration
 */
function getPaymentProviderConfig() {
  const env = getEnv();
  
  return {
    provider: "coinbase" as const,
    coinbaseConfig: {
      apiKey: env.COINBASE_API_KEY,
      apiSecret: env.COINBASE_API_SECRET,
      apiUrl: env.COINBASE_API_URL,
      webhookSecret: env.COINBASE_WEBHOOK_SECRET,
    },
  };
}

/**
 * Get PaymentService instance (singleton)
 */
export function getPaymentService(): PaymentService {
  if (!paymentServiceInstance) {
    paymentServiceInstance = new PaymentService(
      getBlockchainConfig(),
      getPaymentProviderConfig()
    );
  }
  return paymentServiceInstance;
}

/**
 * Get PlanService instance (singleton)
 */
export function getPlanService(): PlanService {
  if (!planServiceInstance) {
    planServiceInstance = new PlanService(getBlockchainConfig());
  }
  return planServiceInstance;
}

/**
 * Get TokenService instance (singleton)
 */
export function getTokenService(): TokenService {
  if (!tokenServiceInstance) {
    tokenServiceInstance = new TokenService(getBlockchainConfig());
  }
  return tokenServiceInstance;
}

/**
 * Get RedemptionService instance (singleton)
 */
export function getRedemptionService(): RedemptionService {
  if (!redemptionServiceInstance) {
    const { NPPAdapter } = require("./abilitypay/banking");
    const env = getEnv();
    
    const nppAdapter = new NPPAdapter({
      apiUrl: env.NPP_API_URL,
      apiKey: env.NPP_API_KEY,
      merchantId: env.NPP_MERCHANT_ID,
    });
    
    redemptionServiceInstance = new RedemptionService(nppAdapter);
  }
  return redemptionServiceInstance;
}

/**
 * Get ValidationService instance (singleton)
 */
export function getValidationService(): ValidationService {
  if (!validationServiceInstance) {
    validationServiceInstance = new ValidationService();
  }
  return validationServiceInstance;
}
