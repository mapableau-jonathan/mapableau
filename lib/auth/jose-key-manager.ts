/**
 * JOSE Key Manager
 * Manages cryptographic keys for JWT signing and encryption
 * Supports key rotation and multiple key types
 */

import * as jose from "jose";
import { randomUUID } from "crypto";
import { getEnv } from "@/lib/config/env";
import { logger } from "@/lib/logger";

const env = getEnv();

export interface KeyPair {
  privateKey: jose.KeyLike;
  publicKey: jose.KeyLike;
  kid: string; // Key ID
  algorithm: string;
  createdAt: number;
}

/**
 * Key Manager Singleton
 * Manages signing and encryption keys for JOSE operations
 */
class JoseKeyManager {
  private signingKey: jose.KeyLike | null = null;
  private encryptionKey: jose.KeyLike | null = null;
  private refreshSigningKey: jose.KeyLike | null = null;
  private keyId: string = "default";
  private initialized = false;

  /**
   * Initialize keys from environment or generate new ones
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Get secret from environment
      const secret = process.env.JWT_SECRET || env.NEXTAUTH_SECRET;
      if (!secret) {
        throw new Error("JWT_SECRET or NEXTAUTH_SECRET must be set");
      }

      // Convert secret to Uint8Array for JOSE
      const secretBytes = new TextEncoder().encode(secret);

      // Create signing key (HMAC)
      this.signingKey = await jose.importKey(
        secretBytes,
        { name: "HMAC", hash: "SHA-256" },
        { extractable: false }
      );

      // Create refresh token signing key (can be same or different)
      const refreshSecret =
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || secret;
      const refreshSecretBytes = new TextEncoder().encode(refreshSecret);
      this.refreshSigningKey = await jose.importKey(
        refreshSecretBytes,
        { name: "HMAC", hash: "SHA-256" },
        { extractable: false }
      );

      // For encryption, we can use the same secret or a derived key
      // In production, consider using separate encryption keys
      this.encryptionKey = await jose.importKey(
        secretBytes,
        { name: "HMAC", hash: "SHA-256" },
        { extractable: false }
      );

      this.initialized = true;
      logger.info("JOSE key manager initialized");
    } catch (error) {
      logger.error("Failed to initialize JOSE key manager", error);
      throw error;
    }
  }

  /**
   * Get signing key for JWT tokens
   */
  async getSigningKey(): Promise<jose.KeyLike> {
    if (!this.initialized) {
      await this.initialize();
    }
    if (!this.signingKey) {
      throw new Error("Signing key not initialized");
    }
    return this.signingKey;
  }

  /**
   * Get encryption key for JWE tokens
   */
  async getEncryptionKey(): Promise<jose.KeyLike> {
    if (!this.initialized) {
      await this.initialize();
    }
    if (!this.encryptionKey) {
      throw new Error("Encryption key not initialized");
    }
    return this.encryptionKey;
  }

  /**
   * Get refresh token signing key
   */
  async getRefreshSigningKey(): Promise<jose.KeyLike> {
    if (!this.initialized) {
      await this.initialize();
    }
    if (!this.refreshSigningKey) {
      throw new Error("Refresh signing key not initialized");
    }
    return this.refreshSigningKey;
  }

  /**
   * Get key ID
   */
  getKeyId(): string {
    return this.keyId;
  }

  /**
   * Generate a new key pair (for future key rotation)
   */
  async generateKeyPair(algorithm: "RS256" | "ES256" = "RS256"): Promise<KeyPair> {
    const alg = algorithm === "RS256" ? "RS256" : "ES256";
    const { publicKey, privateKey } = await jose.generateKeyPair(alg);

    return {
      privateKey,
      publicKey,
      kid: randomUUID(),
      algorithm: alg,
      createdAt: Date.now(),
    };
  }
}

// Singleton instance
export const keyManager = new JoseKeyManager();

/**
 * Initialize key manager on module load
 */
keyManager.initialize().catch((error) => {
  logger.error("Failed to initialize JOSE key manager on module load", error);
});
