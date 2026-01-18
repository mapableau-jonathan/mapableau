/**
 * JWK (JSON Web Key) Service
 * Manages cryptographic keys for JOSE operations
 */

import crypto from "crypto";
import { logger } from "@/lib/logger";

export type KeyType = "RSA" | "EC" | "oct"; // octet sequence (symmetric)

export interface JWK {
  kty: KeyType; // Key type
  use?: "sig" | "enc"; // Key use
  key_ops?: string[]; // Key operations
  alg?: string; // Algorithm
  kid?: string; // Key ID
  x5c?: string[]; // X.509 certificate chain
  x5t?: string; // X.509 certificate SHA-1 thumbprint
  x5t_S256?: string; // X.509 certificate SHA-256 thumbprint
  // RSA specific
  n?: string; // Modulus
  e?: string; // Exponent
  d?: string; // Private exponent
  p?: string; // First prime factor
  q?: string; // Second prime factor
  // EC specific
  crv?: string; // Curve
  x?: string; // X coordinate
  y?: string; // Y coordinate
  // Octet sequence specific
  k?: string; // Key value (base64url)
}

export interface KeyPair {
  publicKey: JWK;
  privateKey: JWK;
  keyId: string;
}

/**
 * Generate RSA key pair
 */
export function generateRSAKeyPair(keySize: 2048 | 3072 | 4096 = 2048): {
  publicKey: crypto.KeyObject;
  privateKey: crypto.KeyObject;
  keyId: string;
} {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: keySize,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  const keyId = crypto.randomBytes(16).toString("hex");

  return {
    publicKey: crypto.createPublicKey(publicKey),
    privateKey: crypto.createPrivateKey(privateKey),
    keyId,
  };
}

/**
 * Generate EC key pair
 */
export function generateECKeyPair(
  curve: "P-256" | "P-384" | "P-521" = "P-256"
): {
  publicKey: crypto.KeyObject;
  privateKey: crypto.KeyObject;
  keyId: string;
} {
  const curveName = curve === "P-256" ? "prime256v1" : curve === "P-384" ? "secp384r1" : "secp521r1";

  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
    namedCurve: curveName,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  const keyId = crypto.randomBytes(16).toString("hex");

  return {
    publicKey: crypto.createPublicKey(publicKey),
    privateKey: crypto.createPrivateKey(privateKey),
    keyId,
  };
}

/**
 * Generate symmetric key (octet sequence)
 */
export function generateSymmetricKey(keySize: 128 | 192 | 256 = 256): {
  key: Buffer;
  keyId: string;
} {
  const key = crypto.randomBytes(keySize / 8);
  const keyId = crypto.randomBytes(16).toString("hex");

  return { key, keyId };
}

/**
 * Convert RSA public key to JWK
 */
export function rsaPublicKeyToJWK(
  publicKey: crypto.KeyObject,
  keyId: string,
  alg?: string
): JWK {
  const keyDetails = publicKey.asymmetricKeyDetails || {};
  const publicKeyPEM = publicKey.export({ type: "spki", format: "pem" });
  const publicKeyDer = crypto.createPublicKey(publicKeyPEM).export({ type: "spki", format: "der" });

  // Extract modulus and exponent from DER
  // This is simplified - in production, use a proper ASN.1 parser
  const jwk: JWK = {
    kty: "RSA",
    use: "sig",
    kid: keyId,
    ...(alg && { alg }),
  };

  // Note: Proper extraction of n and e requires ASN.1 parsing
  // This is a placeholder - implement proper extraction
  return jwk;
}

/**
 * Convert RSA private key to JWK
 */
export function rsaPrivateKeyToJWK(
  privateKey: crypto.KeyObject,
  keyId: string,
  alg?: string
): JWK {
  const jwk: JWK = {
    kty: "RSA",
    use: "sig",
    kid: keyId,
    ...(alg && { alg }),
  };

  // Note: Proper extraction requires ASN.1 parsing
  return jwk;
}

/**
 * Convert EC public key to JWK
 */
export function ecPublicKeyToJWK(
  publicKey: crypto.KeyObject,
  keyId: string,
  curve: "P-256" | "P-384" | "P-521",
  alg?: string
): JWK {
  const jwk: JWK = {
    kty: "EC",
    crv: curve,
    use: "sig",
    kid: keyId,
    ...(alg && { alg }),
  };

  // Note: Proper extraction of x and y requires key parsing
  return jwk;
}

/**
 * Convert symmetric key to JWK
 */
export function symmetricKeyToJWK(
  key: Buffer,
  keyId: string,
  alg?: string
): JWK {
  return {
    kty: "oct",
    k: key.toString("base64url"),
    use: "enc",
    kid: keyId,
    ...(alg && { alg }),
  };
}

/**
 * Convert JWK to crypto key object
 */
export function jwkToKey(jwk: JWK): crypto.KeyObject | Buffer {
  if (jwk.kty === "RSA") {
    // Reconstruct RSA key from JWK
    // This requires proper ASN.1 encoding
    // Placeholder implementation
    throw new Error("RSA JWK to key conversion not fully implemented");
  } else if (jwk.kty === "EC") {
    // Reconstruct EC key from JWK
    throw new Error("EC JWK to key conversion not fully implemented");
  } else if (jwk.kty === "oct") {
    // Symmetric key
    if (!jwk.k) {
      throw new Error("Missing key value in JWK");
    }
    return Buffer.from(jwk.k, "base64url");
  }

  throw new Error(`Unsupported key type: ${jwk.kty}`);
}

/**
 * Key Store - In-memory key storage
 * In production, use secure key management service (AWS KMS, Azure Key Vault, etc.)
 */
class KeyStore {
  private keys: Map<string, { publicKey?: JWK; privateKey?: JWK; symmetricKey?: Buffer }> = new Map();

  /**
   * Store key pair
   */
  storeKeyPair(keyId: string, publicKey: JWK, privateKey: JWK): void {
    this.keys.set(keyId, { publicKey, privateKey });
  }

  /**
   * Store symmetric key
   */
  storeSymmetricKey(keyId: string, key: Buffer): void {
    this.keys.set(keyId, { symmetricKey: key });
  }

  /**
   * Get public key
   */
  getPublicKey(keyId: string): JWK | undefined {
    return this.keys.get(keyId)?.publicKey;
  }

  /**
   * Get private key
   */
  getPrivateKey(keyId: string): JWK | undefined {
    return this.keys.get(keyId)?.privateKey;
  }

  /**
   * Get symmetric key
   */
  getSymmetricKey(keyId: string): Buffer | undefined {
    return this.keys.get(keyId)?.symmetricKey;
  }

  /**
   * List all key IDs
   */
  listKeyIds(): string[] {
    return Array.from(this.keys.keys());
  }

  /**
   * Delete key
   */
  deleteKey(keyId: string): void {
    this.keys.delete(keyId);
  }
}

// Singleton key store
export const keyStore = new KeyStore();
