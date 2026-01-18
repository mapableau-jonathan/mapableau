/**
 * Data Exchange Orchestrator
 * Orchestrates JWT/JOSE data exchange between services
 * Optimized for performance with cached values and pre-loaded modules
 */

import { encodeJWT, decodeJWT, createJWE, decryptJWE, createJWS, verifyJWS, JWTPayload } from "./jose-service";
import { keyStore } from "./jwk-service";
import { serviceRegistry, ServiceId } from "./service-registry";
import { logger } from "@/lib/logger";
import crypto from "crypto";

// Cache frequently accessed values to avoid repeated lookups
let cachedDefaultSecret: string | null = null;
let cachedDefaultEncryptionKey: Buffer | null = null;

/**
 * Get default secret (cached)
 */
function getDefaultSecret(): string {
  if (!cachedDefaultSecret) {
    cachedDefaultSecret = process.env.JWT_SECRET || "default-secret";
  }
  return cachedDefaultSecret;
}

/**
 * Get default encryption key (cached)
 */
function getDefaultEncryptionKey(): Buffer {
  if (!cachedDefaultEncryptionKey) {
    const secret = getDefaultSecret();
    cachedDefaultEncryptionKey = keyStore.getSymmetricKey("default") || Buffer.from(secret);
  }
  return cachedDefaultEncryptionKey;
}

// Pre-load jwk-service module to avoid dynamic import overhead
let jwkServiceModule: typeof import("./jwk-service") | null = null;
async function getJwkService() {
  if (!jwkServiceModule) {
    jwkServiceModule = await import("./jwk-service");
  }
  return jwkServiceModule;
}

export interface DataExchangeRequest {
  fromService: ServiceId;
  toService: ServiceId;
  data: Record<string, any>;
  options?: {
    sign?: boolean;
    encrypt?: boolean;
    algorithm?: string;
    encryptionAlgorithm?: string;
    keyId?: string;
  };
}

export interface DataExchangeResponse {
  success: boolean;
  token?: string;
  format?: "jwt" | "jwe" | "jws" | "nested";
  keyId?: string;
  error?: string;
}

export interface DataExchangeValidation {
  valid: boolean;
  data?: Record<string, any>;
  fromService?: ServiceId;
  toService?: ServiceId;
  error?: string;
}

/**
 * Orchestrate data exchange between services
 */
export async function orchestrateDataExchange(
  request: DataExchangeRequest
): Promise<DataExchangeResponse> {
  try {
    // Validate services
    const fromService = serviceRegistry.get(request.fromService);
    const toService = serviceRegistry.get(request.toService);

    if (!fromService || !toService) {
      return {
        success: false,
        error: "Invalid service specified",
      };
    }

    const options = request.options || {};
    const shouldSign = options.sign !== false; // Default to true
    const shouldEncrypt = options.encrypt === true; // Default to false

    // Optimize: calculate timestamp once
    const now = Math.floor(Date.now() / 1000);
    
    // Create JWT payload
    const payload: JWTPayload = {
      iss: request.fromService,
      aud: request.toService,
      iat: now,
      exp: now + 3600, // 1 hour
      jti: crypto.randomUUID(),
      data: request.data,
    };

    // Get or generate keys (optimized: only load what we need)
    const keyId = options.keyId || `key-${request.fromService}-${request.toService}`;
    const defaultSecret = getDefaultSecret();
    
    // Optimize key retrieval: only fetch what's needed
    let signingKey: string | Buffer = defaultSecret;
    let encryptionKey: string | Buffer = Buffer.from(defaultSecret);

    // Optimize: Pre-load jwk-service if we need it
    const needsJwkService = shouldSign || shouldEncrypt;
    const jwkService = needsJwkService ? await getJwkService() : null;

    // Get signing key only if signing is required
    if (shouldSign && jwkService) {
      const privateKeyJWK = keyStore.getPrivateKey(keyId);
      if (privateKeyJWK) {
        signingKey = jwkService.jwkToKey(privateKeyJWK) as Buffer;
      }
      // else: already set to defaultSecret
    }

    // Get encryption key only if encryption is required
    if (shouldEncrypt && jwkService) {
      const symKey = keyStore.getSymmetricKey(keyId);
      if (symKey) {
        encryptionKey = symKey;
      } else {
        // Generate new symmetric key only when needed
        const { key, keyId: newKeyId } = jwkService.generateSymmetricKey(256);
        encryptionKey = key;
        keyStore.storeSymmetricKey(newKeyId, key);
      }
    }

    // Optimize: Cache algorithm options to avoid repeated property access
    const algorithm = (options.algorithm as any) || "HS256";
    const encryptionAlgorithm = (options.encryptionAlgorithm as any) || "A256GCM";
    const jweOptions = { alg: "dir" as const, enc: encryptionAlgorithm, kid: keyId };

    // Create token based on requirements (optimized: reduce conditional branches)
    let token: string;
    let format: "jwt" | "jwe" | "jws" | "nested";

    if (shouldEncrypt && shouldSign) {
      // Nested JWT: signed then encrypted
      const signed = encodeJWT(payload, signingKey, { algorithm, keyId });
      token = createJWE(signed.token, encryptionKey, jweOptions);
      format = "nested";
    } else if (shouldEncrypt) {
      // JWE: encrypted only
      token = createJWE(JSON.stringify(payload), encryptionKey, jweOptions);
      format = "jwe";
    } else if (shouldSign) {
      // JWT or JWS: signed
      token = encodeJWT(payload, signingKey, { algorithm, keyId }).token;
      format = "jwt";
    } else {
      // Plain JWT (not recommended for production)
      token = encodeJWT(payload, signingKey, { algorithm: "none" as any }).token;
      format = "jwt";
    }

    logger.info("Data exchange orchestrated", {
      fromService: request.fromService,
      toService: request.toService,
      format,
      keyId,
    });

    return {
      success: true,
      token,
      format,
      keyId,
    };
  } catch (error) {
    logger.error("Data exchange orchestration error", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Data exchange failed",
    };
  }
}

/**
 * Validate and decode exchanged data
 */
export async function validateDataExchange(
  token: string,
  toService: ServiceId,
  format?: "jwt" | "jwe" | "jws" | "nested"
): Promise<DataExchangeValidation> {
  try {
    // Detect format if not specified
    if (!format) {
      const parts = token.split(".");
      if (parts.length === 3) {
        format = "jwt"; // Could be JWT or JWS
      } else if (parts.length === 5) {
        format = "jwe";
      } else {
        return {
          valid: false,
          error: "Invalid token format",
        };
      }
    }

    // Validate service
    const service = serviceRegistry.get(toService);
    if (!service) {
      return {
        valid: false,
        error: "Invalid service",
      };
    }

    let payload: JWTPayload;
    let fromService: ServiceId | undefined;

    // Optimize: cache default secret to avoid repeated lookups
    const defaultSecret = process.env.JWT_SECRET || "default-secret";
    const defaultEncryptionKey = keyStore.getSymmetricKey("default") || Buffer.from(defaultSecret);

    if (format === "jwe") {
      // Decrypt JWE
      const decrypted = decryptJWE(token, defaultEncryptionKey);
      payload = JSON.parse(decrypted.payload);
      fromService = payload.iss as ServiceId;
    } else if (format === "nested") {
      // Decrypt and verify nested JWT (optimized: no await needed, function is synchronous)
      const verified = verifyNestedJWT(token, defaultEncryptionKey, defaultSecret);
      payload = verified.payload;
      fromService = payload.iss as ServiceId;
    } else {
      // Verify JWT
      const decoded = decodeJWT(token, defaultSecret, {
        audience: toService,
      });
      payload = decoded.payload;
      fromService = payload.iss as ServiceId;
    }

    // Optimize: Calculate timestamp once for validation
    const now = Math.floor(Date.now() / 1000);

    // Validate audience (optimized: check single value first, then array)
    const audience = payload.aud;
    if (typeof audience === "string") {
      if (audience !== toService) {
        return {
          valid: false,
          error: "Token not intended for this service",
        };
      }
    } else if (Array.isArray(audience)) {
      if (!audience.includes(toService)) {
        return {
          valid: false,
          error: "Token not intended for this service",
        };
      }
    } else if (audience !== undefined) {
      return {
        valid: false,
        error: "Token not intended for this service",
      };
    }

    // Validate expiration
    if (payload.exp && payload.exp < now) {
      return {
        valid: false,
        error: "Token expired",
      };
    }

    return {
      valid: true,
      data: payload.data,
      fromService,
      toService,
    };
  } catch (error) {
    logger.error("Data exchange validation error", error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Validation failed",
    };
  }
}

// Helper function for nested JWT verification (optimized: no dynamic import)
function verifyNestedJWT(
  nestedJWT: string,
  encryptionKey: string | Buffer,
  signingKey: string | Buffer,
  options: { algorithms?: string[] } = {}
): { payload: JWTPayload } {
  // First decrypt (functions are already imported at top)
  const decrypted = decryptJWE(nestedJWT, encryptionKey);
  const signedJWT = decrypted.payload;

  // Then verify signature
  const verified = decodeJWT(signedJWT, signingKey, {
    algorithms: options.algorithms as any,
  });

  return verified;
}
