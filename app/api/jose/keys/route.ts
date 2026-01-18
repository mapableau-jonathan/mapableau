/**
 * JWK (JSON Web Key) Endpoint
 * Manages cryptographic keys for JOSE operations
 */

import { NextRequest, NextResponse } from "next/server";
import {
  generateRSAKeyPair,
  generateECKeyPair,
  generateSymmetricKey,
  keyStore,
  rsaPublicKeyToJWK,
  symmetricKeyToJWK,
} from "@/lib/services/auth/jwk-service";
import { authenticate } from "@/lib/auth/middleware";
import { logger } from "@/lib/logger";

/**
 * GET /api/jose/keys
 * List available keys
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const authResult = authenticate(request, { required: true });
    if (authResult.error) {
      return authResult.error;
    }

    const keyIds = keyStore.listKeyIds();

    return NextResponse.json({
      keys: keyIds.map((keyId) => ({
        keyId,
        publicKey: keyStore.getPublicKey(keyId),
      })),
      count: keyIds.length,
    });
  } catch (error) {
    logger.error("JWK list error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/jose/keys
 * Generate new key pair
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const authResult = authenticate(request, { required: true });
    if (authResult.error) {
      return authResult.error;
    }

    const body = await request.json();
    const { type, keySize, curve, algorithm } = body;

    let keyPair: any;
    let publicKeyJWK: any;
    let keyId: string;

    if (type === "RSA") {
      const result = generateRSAKeyPair(keySize || 2048);
      keyPair = result;
      keyId = result.keyId;
      publicKeyJWK = rsaPublicKeyToJWK(result.publicKey, keyId, algorithm);
      // Store keys (simplified - should properly convert to JWK)
      keyStore.storeSymmetricKey(keyId, result.privateKey.export({ type: "pkcs8", format: "der" }) as Buffer);
    } else if (type === "EC") {
      const result = generateECKeyPair(curve || "P-256");
      keyPair = result;
      keyId = result.keyId;
      // Store keys (simplified)
      keyStore.storeSymmetricKey(keyId, result.privateKey.export({ type: "pkcs8", format: "der" }) as Buffer);
    } else if (type === "oct") {
      const result = generateSymmetricKey(keySize || 256);
      keyId = result.keyId;
      publicKeyJWK = symmetricKeyToJWK(result.key, keyId, algorithm);
      keyStore.storeSymmetricKey(keyId, result.key);
    } else {
      return NextResponse.json(
        { error: "Invalid key type. Use RSA, EC, or oct" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      keyId,
      publicKey: publicKeyJWK,
      // Never return private key
    });
  } catch (error) {
    logger.error("JWK generation error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Key generation failed" },
      { status: 500 }
    );
  }
}
