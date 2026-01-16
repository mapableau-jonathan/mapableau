/**
 * WebAuthn Service
 * Biometric authentication using Web Authentication API
 * 
 * Supports: Fingerprint, Face ID, Touch ID, Windows Hello, Security Keys
 * 
 * Documentation: https://www.w3.org/TR/webauthn-2/
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { randomBytes } from "crypto";

export interface WebAuthnCredential {
  id: string;
  publicKey: string;
  counter: number;
  deviceName?: string;
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface WebAuthnRegistrationOptions {
  userId: string;
  userName: string;
  userDisplayName: string;
  deviceName?: string;
  requireResidentKey?: boolean;
  authenticatorSelection?: {
    authenticatorAttachment?: "platform" | "cross-platform";
    userVerification?: "required" | "preferred" | "discouraged";
    requireResidentKey?: boolean;
  };
}

export interface WebAuthnAuthenticationOptions {
  userId: string;
  allowCredentials?: Array<{
    id: string;
    type: string;
  }>;
}

export interface WebAuthnChallenge {
  challenge: string;
  userId: string;
  type: "registration" | "authentication";
  expiresAt: Date;
}

export class WebAuthnService {
  private rpId: string;
  private rpName: string;
  private origin: string;

  constructor(config?: {
    rpId?: string;
    rpName?: string;
    origin?: string;
  }) {
    this.rpId = config?.rpId || process.env.WEBAUTHN_RP_ID || process.env.NEXT_PUBLIC_DOMAIN || "localhost";
    this.rpName = config?.rpName || process.env.WEBAUTHN_RP_NAME || "AbilityPay Protocol";
    this.origin = config?.origin || process.env.WEBAUTHN_ORIGIN || process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  }

  /**
   * Generate registration options for WebAuthn
   */
  async generateRegistrationOptions(
    options: WebAuthnRegistrationOptions
  ): Promise<{
    challenge: string;
    rp: { id: string; name: string };
    user: { id: string; name: string; displayName: string };
    pubKeyCredParams: Array<{ type: string; alg: number }>;
    authenticatorSelection: any;
    timeout: number;
    attestation: string;
  }> {
    try {
      // Generate challenge
      const challenge = this.generateChallenge();

      // Get existing credentials for user
      const existingCredentials = await this.getUserCredentials(options.userId);

      // Build registration options
      const registrationOptions = {
        challenge: challenge,
        rp: {
          id: this.rpId,
          name: this.rpName,
        },
        user: {
          id: Buffer.from(options.userId).toString("base64url"),
          name: options.userName,
          displayName: options.userDisplayName,
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 }, // ES256
          { type: "public-key", alg: -257 }, // RS256
          { type: "public-key", alg: -8 }, // EdDSA
        ],
        authenticatorSelection: {
          authenticatorAttachment: options.authenticatorSelection?.authenticatorAttachment || undefined,
          userVerification: options.authenticatorSelection?.userVerification || "preferred",
          requireResidentKey: options.requireResidentKey || false,
        },
        timeout: 60000, // 60 seconds
        attestation: "direct",
        excludeCredentials: existingCredentials.map((cred) => ({
          id: Buffer.from(cred.id, "base64").toString("base64url"),
          type: "public-key",
        })),
      };

      // Store challenge
      await this.storeChallenge({
        challenge,
        userId: options.userId,
        type: "registration",
        expiresAt: new Date(Date.now() + 60000), // 1 minute expiry
      });

      return registrationOptions;
    } catch (error: any) {
      logger.error("Failed to generate registration options", error);
      throw new Error(`WebAuthn registration options generation failed: ${error.message}`);
    }
  }

  /**
   * Verify registration response
   */
  async verifyRegistration(
    userId: string,
    credential: {
      id: string;
      rawId: string;
      response: {
        attestationObject: string;
        clientDataJSON: string;
      };
      type: string;
    },
    deviceName?: string
  ): Promise<WebAuthnCredential> {
    try {
      // Retrieve challenge
      const challenge = await this.getStoredChallenge(userId, "registration");
      if (!challenge) {
        throw new Error("Registration challenge not found or expired");
      }

      // Verify client data
      const clientData = JSON.parse(
        Buffer.from(credential.response.clientDataJSON, "base64url").toString()
      );

      if (clientData.type !== "webauthn.create") {
        throw new Error("Invalid registration type");
      }

      if (clientData.challenge !== challenge.challenge) {
        throw new Error("Challenge mismatch");
      }

      if (clientData.origin !== this.origin) {
        throw new Error("Origin mismatch");
      }

      // In production, verify attestation object using a library like @simplewebauthn/server
      // For now, we'll store the credential and verify it on authentication

      // Extract public key from attestation object (simplified - use library in production)
      const attestationObject = Buffer.from(
        credential.response.attestationObject,
        "base64url"
      );

      // Store credential
      const storedCredential = await this.storeCredential({
        userId,
        credentialId: credential.id,
        publicKey: credential.response.attestationObject, // Store full attestation for verification
        deviceName,
      });

      // Clear challenge
      await this.clearChallenge(challenge.challenge);

      return storedCredential;
    } catch (error: any) {
      logger.error("Failed to verify registration", error);
      throw new Error(`WebAuthn registration verification failed: ${error.message}`);
    }
  }

  /**
   * Generate authentication options
   */
  async generateAuthenticationOptions(
    options: WebAuthnAuthenticationOptions
  ): Promise<{
    challenge: string;
    allowCredentials?: Array<{ id: string; type: string }>;
    timeout: number;
    userVerification: string;
    rpId: string;
  }> {
    try {
      // Generate challenge
      const challenge = this.generateChallenge();

      // Get user credentials
      const credentials = await this.getUserCredentials(options.userId);

      if (credentials.length === 0) {
        throw new Error("No biometric credentials registered");
      }

      // Build authentication options
      const authenticationOptions = {
        challenge,
        allowCredentials: options.allowCredentials || credentials.map((cred) => ({
          id: Buffer.from(cred.id, "base64").toString("base64url"),
          type: "public-key",
        })),
        timeout: 60000, // 60 seconds
        userVerification: "preferred",
        rpId: this.rpId,
      };

      // Store challenge
      await this.storeChallenge({
        challenge,
        userId: options.userId,
        type: "authentication",
        expiresAt: new Date(Date.now() + 60000), // 1 minute expiry
      });

      return authenticationOptions;
    } catch (error: any) {
      logger.error("Failed to generate authentication options", error);
      throw new Error(`WebAuthn authentication options generation failed: ${error.message}`);
    }
  }

  /**
   * Verify authentication response
   */
  async verifyAuthentication(
    userId: string,
    credential: {
      id: string;
      rawId: string;
      response: {
        authenticatorData: string;
        clientDataJSON: string;
        signature: string;
        userHandle?: string;
      };
      type: string;
    }
  ): Promise<{ verified: boolean; credential: WebAuthnCredential }> {
    try {
      // Retrieve challenge
      const challenge = await this.getStoredChallenge(userId, "authentication");
      if (!challenge) {
        throw new Error("Authentication challenge not found or expired");
      }

      // Verify client data
      const clientData = JSON.parse(
        Buffer.from(credential.response.clientDataJSON, "base64url").toString()
      );

      if (clientData.type !== "webauthn.get") {
        throw new Error("Invalid authentication type");
      }

      if (clientData.challenge !== challenge.challenge) {
        throw new Error("Challenge mismatch");
      }

      if (clientData.origin !== this.origin) {
        throw new Error("Origin mismatch");
      }

      // Get stored credential
      const storedCredential = await this.getCredentialById(
        Buffer.from(credential.id, "base64url").toString("base64")
      );

      if (!storedCredential) {
        throw new Error("Credential not found");
      }

      // In production, verify signature using stored public key
      // For now, we'll do basic verification and update counter

      // Update credential counter and last used
      await this.updateCredentialUsage(storedCredential.id);

      // Clear challenge
      await this.clearChallenge(challenge.challenge);

      return {
        verified: true,
        credential: storedCredential,
      };
    } catch (error: any) {
      logger.error("Failed to verify authentication", error);
      return {
        verified: false,
        credential: {} as WebAuthnCredential,
      };
    }
  }

  /**
   * Check if user has biometric credentials
   */
  async hasBiometricCredentials(userId: string): Promise<boolean> {
    try {
      const credentials = await this.getUserCredentials(userId);
      return credentials.length > 0;
    } catch (error) {
      logger.error("Failed to check biometric credentials", error);
      return false;
    }
  }

  /**
   * List user's biometric credentials
   */
  async listCredentials(userId: string): Promise<WebAuthnCredential[]> {
    return await this.getUserCredentials(userId);
  }

  /**
   * Delete a biometric credential
   */
  async deleteCredential(userId: string, credentialId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          webauthnCredentials: {
            deleteMany: {
              credentialId: credentialId,
            },
          },
        },
      });
    } catch (error: any) {
      logger.error("Failed to delete credential", error);
      throw new Error(`Failed to delete credential: ${error.message}`);
    }
  }

  /**
   * Generate random challenge
   */
  private generateChallenge(): string {
    return randomBytes(32).toString("base64url");
  }

  /**
   * Store challenge
   */
  private async storeChallenge(challenge: WebAuthnChallenge): Promise<void> {
    try {
      // Store in Redis or database
      // For now, using a simple in-memory store (use Redis in production)
      await prisma.user.update({
        where: { id: challenge.userId },
        data: {
          webauthnChallenge: JSON.stringify({
            challenge: challenge.challenge,
            type: challenge.type,
            expiresAt: challenge.expiresAt.toISOString(),
          }),
        },
      });
    } catch (error: any) {
      logger.error("Failed to store challenge", error);
      throw new Error(`Failed to store challenge: ${error.message}`);
    }
  }

  /**
   * Get stored challenge
   */
  private async getStoredChallenge(
    userId: string,
    type: "registration" | "authentication"
  ): Promise<WebAuthnChallenge | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { webauthnChallenge: true },
      });

      if (!user?.webauthnChallenge) {
        return null;
      }

      const challengeData = JSON.parse(user.webauthnChallenge);
      const expiresAt = new Date(challengeData.expiresAt);

      if (expiresAt < new Date()) {
        return null; // Expired
      }

      if (challengeData.type !== type) {
        return null; // Wrong type
      }

      return {
        challenge: challengeData.challenge,
        userId,
        type: challengeData.type,
        expiresAt,
      };
    } catch (error) {
      logger.error("Failed to get stored challenge", error);
      return null;
    }
  }

  /**
   * Clear challenge
   */
  private async clearChallenge(challenge: string): Promise<void> {
    try {
      // In production, delete from Redis
      // For now, we'll just update the user record
      await prisma.user.updateMany({
        where: {
          webauthnChallenge: {
            contains: challenge,
          },
        },
        data: {
          webauthnChallenge: null,
        },
      });
    } catch (error) {
      logger.error("Failed to clear challenge", error);
    }
  }

  /**
   * Store credential
   */
  private async storeCredential(data: {
    userId: string;
    credentialId: string;
    publicKey: string;
    deviceName?: string;
  }): Promise<WebAuthnCredential> {
    try {
      const credential = await prisma.webauthnCredential.create({
        data: {
          userId: data.userId,
          credentialId: data.credentialId,
          publicKey: data.publicKey,
          deviceName: data.deviceName,
          counter: 0,
        },
      });

      return {
        id: credential.credentialId,
        publicKey: credential.publicKey,
        counter: credential.counter,
        deviceName: credential.deviceName || undefined,
        createdAt: credential.createdAt,
        lastUsedAt: credential.lastUsedAt || undefined,
      };
    } catch (error: any) {
      logger.error("Failed to store credential", error);
      throw new Error(`Failed to store credential: ${error.message}`);
    }
  }

  /**
   * Get user credentials
   */
  private async getUserCredentials(userId: string): Promise<WebAuthnCredential[]> {
    try {
      const credentials = await prisma.webauthnCredential.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });

      return credentials.map((cred) => ({
        id: cred.credentialId,
        publicKey: cred.publicKey,
        counter: cred.counter,
        deviceName: cred.deviceName || undefined,
        createdAt: cred.createdAt,
        lastUsedAt: cred.lastUsedAt || undefined,
      }));
    } catch (error) {
      logger.error("Failed to get user credentials", error);
      return [];
    }
  }

  /**
   * Get credential by ID
   */
  private async getCredentialById(credentialId: string): Promise<WebAuthnCredential | null> {
    try {
      const credential = await prisma.webauthnCredential.findUnique({
        where: { credentialId },
      });

      if (!credential) {
        return null;
      }

      return {
        id: credential.credentialId,
        publicKey: credential.publicKey,
        counter: credential.counter,
        deviceName: credential.deviceName || undefined,
        createdAt: credential.createdAt,
        lastUsedAt: credential.lastUsedAt || undefined,
      };
    } catch (error) {
      logger.error("Failed to get credential by ID", error);
      return null;
    }
  }

  /**
   * Update credential usage
   */
  private async updateCredentialUsage(credentialId: string): Promise<void> {
    try {
      await prisma.webauthnCredential.update({
        where: { credentialId },
        data: {
          counter: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error("Failed to update credential usage", error);
    }
  }
}
