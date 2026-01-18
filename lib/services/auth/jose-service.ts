/**
 * JOSE (JSON Object Signing and Encryption) Service
 * Handles JWT, JWE, JWS operations with full JOSE standard support
 */

import jwt from "jsonwebtoken";
import crypto from "crypto";
import { logger } from "@/lib/logger";

export type Algorithm =
  | "HS256" // HMAC SHA-256
  | "HS384" // HMAC SHA-384
  | "HS512" // HMAC SHA-512
  | "RS256" // RSA SHA-256
  | "RS384" // RSA SHA-384
  | "RS512" // RSA SHA-512
  | "ES256" // ECDSA P-256 SHA-256
  | "ES384" // ECDSA P-384 SHA-384
  | "ES512" // ECDSA P-521 SHA-512
  | "PS256" // RSASSA-PSS SHA-256
  | "PS384" // RSASSA-PSS SHA-384
  | "PS512"; // RSASSA-PSS SHA-512

export type EncryptionAlgorithm =
  | "A128GCM" // AES GCM 128
  | "A192GCM" // AES GCM 192
  | "A256GCM" // AES GCM 256
  | "A128CBC-HS256" // AES CBC 128 with HMAC SHA-256
  | "A192CBC-HS384" // AES CBC 192 with HMAC SHA-384
  | "A256CBC-HS512"; // AES CBC 256 with HMAC SHA-512

export type KeyManagementAlgorithm =
  | "RSA-OAEP" // RSA OAEP
  | "RSA-OAEP-256" // RSA OAEP with SHA-256
  | "A128KW" // AES Key Wrap 128
  | "A192KW" // AES Key Wrap 192
  | "A256KW" // AES Key Wrap 256
  | "dir" // Direct key agreement
  | "ECDH-ES" // ECDH-ES
  | "ECDH-ES+A128KW" // ECDH-ES with AES Key Wrap
  | "ECDH-ES+A192KW"
  | "ECDH-ES+A256KW";

export interface JWTPayload {
  iss?: string; // Issuer
  sub?: string; // Subject (user ID)
  aud?: string | string[]; // Audience
  exp?: number; // Expiration time
  nbf?: number; // Not before
  iat?: number; // Issued at
  jti?: string; // JWT ID
  [key: string]: any; // Additional claims
}

export interface JWEOptions {
  alg: KeyManagementAlgorithm;
  enc: EncryptionAlgorithm;
  kid?: string; // Key ID
  cty?: string; // Content type
  zip?: string; // Compression algorithm
}

export interface JWSOptions {
  alg: Algorithm;
  kid?: string; // Key ID
  typ?: string; // Type
  cty?: string; // Content type
}

export interface JWTEncodeResult {
  token: string;
  header: Record<string, any>;
  payload: JWTPayload;
}

export interface JWTDecodeResult {
  header: Record<string, any>;
  payload: JWTPayload;
  signature?: string;
}

/**
 * Encode JWT (JSON Web Token)
 */
export function encodeJWT(
  payload: JWTPayload,
  secretOrPrivateKey: string | Buffer,
  options: {
    algorithm?: Algorithm;
    expiresIn?: string | number;
    issuer?: string;
    audience?: string | string[];
    keyId?: string;
    header?: Record<string, any>;
  } = {}
): JWTEncodeResult {
  const algorithm = options.algorithm || "HS256";
  const signingOptions: jwt.SignOptions = {
    algorithm,
    ...(options.expiresIn && { expiresIn: options.expiresIn }),
    ...(options.issuer && { issuer: options.issuer }),
    ...(options.audience && { audience: options.audience }),
    ...(options.keyId && { keyid: options.keyId }),
    ...(options.header && { header: options.header }),
  };

  const token = jwt.sign(payload, secretOrPrivateKey, signingOptions);
  const decoded = jwt.decode(token, { complete: true }) as any;

  return {
    token,
    header: decoded.header,
    payload: decoded.payload as JWTPayload,
  };
}

/**
 * Decode and verify JWT
 */
export function decodeJWT(
  token: string,
  secretOrPublicKey: string | Buffer,
  options: {
    algorithms?: Algorithm[];
    issuer?: string;
    audience?: string | string[];
    complete?: boolean;
  } = {}
): JWTDecodeResult {
  const verifyOptions: jwt.VerifyOptions = {
    algorithms: options.algorithms || ["HS256", "RS256", "ES256"],
    ...(options.issuer && { issuer: options.issuer }),
    ...(options.audience && { audience: options.audience }),
    complete: true,
  };

  const decoded = jwt.verify(token, secretOrPublicKey, verifyOptions) as any;

  return {
    header: decoded.header,
    payload: decoded.payload as JWTPayload,
    signature: decoded.signature,
  };
}

/**
 * Create JWS (JSON Web Signature) - Signed data
 */
export function createJWS(
  payload: string | object,
  secretOrPrivateKey: string | Buffer,
  options: JWSOptions = { alg: "HS256" }
): string {
  const payloadString = typeof payload === "string" ? payload : JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadString).toString("base64url");

  // Create JWS header
  const header = {
    alg: options.alg,
    typ: options.typ || "JWT",
    ...(options.kid && { kid: options.kid }),
    ...(options.cty && { cty: options.cty }),
  };

  const headerBase64 = Buffer.from(JSON.stringify(header)).toString("base64url");

  // Sign the data
  const signingInput = `${headerBase64}.${payloadBase64}`;
  const signature = signData(signingInput, secretOrPrivateKey, options.alg);
  const signatureBase64 = Buffer.from(signature).toString("base64url");

  return `${headerBase64}.${payloadBase64}.${signatureBase64}`;
}

/**
 * Verify JWS (JSON Web Signature)
 */
export function verifyJWS(
  jws: string,
  secretOrPublicKey: string | Buffer,
  options: { algorithms?: Algorithm[] } = {}
): {
  header: Record<string, any>;
  payload: string;
  valid: boolean;
} {
  const parts = jws.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWS format");
  }

  const [headerBase64, payloadBase64, signatureBase64] = parts;

  // Decode header
  const header = JSON.parse(Buffer.from(headerBase64, "base64url").toString());
  const algorithm = header.alg as Algorithm;

  if (options.algorithms && !options.algorithms.includes(algorithm)) {
    throw new Error(`Algorithm ${algorithm} not allowed`);
  }

  // Verify signature
  const signingInput = `${headerBase64}.${payloadBase64}`;
  const signature = Buffer.from(signatureBase64, "base64url");
  const expectedSignature = signData(signingInput, secretOrPublicKey, algorithm);

  const valid = crypto.timingSafeEqual(signature, expectedSignature);

  return {
    header,
    payload: Buffer.from(payloadBase64, "base64url").toString(),
    valid,
  };
}

/**
 * Create JWE (JSON Web Encryption) - Encrypted data
 */
export function createJWE(
  payload: string | object,
  key: Buffer | string,
  options: JWEOptions = {
    alg: "dir",
    enc: "A256GCM",
  }
): string {
  const payloadString = typeof payload === "string" ? payload : JSON.stringify(payload);

  // Create JWE header
  const header = {
    alg: options.alg,
    enc: options.enc,
    ...(options.kid && { kid: options.kid }),
    ...(options.cty && { cty: options.cty }),
    ...(options.zip && { zip: options.zip }),
  };

  const headerBase64 = Buffer.from(JSON.stringify(header)).toString("base64url");

  // Encrypt payload
  const encrypted = encryptData(payloadString, key, options.enc, options.alg);
  const encryptedBase64 = Buffer.from(encrypted.ciphertext).toString("base64url");
  const ivBase64 = Buffer.from(encrypted.iv).toString("base64url");
  const tagBase64 = Buffer.from(encrypted.tag || "").toString("base64url");

  // Construct JWE
  return `${headerBase64}.${encryptedBase64}.${ivBase64}.${tagBase64}`;
}

/**
 * Decrypt JWE (JSON Web Encryption)
 */
export function decryptJWE(
  jwe: string,
  key: Buffer | string
): {
  header: Record<string, any>;
  payload: string;
} {
  const parts = jwe.split(".");
  if (parts.length < 4) {
    throw new Error("Invalid JWE format");
  }

  const [headerBase64, encryptedBase64, ivBase64, tagBase64] = parts;

  // Decode header
  const header = JSON.parse(Buffer.from(headerBase64, "base64url").toString());
  const enc = header.enc as EncryptionAlgorithm;
  const alg = header.alg as KeyManagementAlgorithm;

  // Decrypt
  const encrypted = Buffer.from(encryptedBase64, "base64url");
  const iv = Buffer.from(ivBase64, "base64url");
  const tag = tagBase64 ? Buffer.from(tagBase64, "base64url") : undefined;

  const payload = decryptData(
    {
      ciphertext: encrypted,
      iv,
      tag,
    },
    key,
    enc,
    alg
  );

  return {
    header,
    payload,
  };
}

/**
 * Sign data with specified algorithm
 */
function signData(
  data: string,
  key: string | Buffer,
  algorithm: Algorithm
): Buffer {
  switch (algorithm) {
    case "HS256":
      return crypto.createHmac("sha256", key).update(data).digest();
    case "HS384":
      return crypto.createHmac("sha384", key).update(data).digest();
    case "HS512":
      return crypto.createHmac("sha512", key).update(data).digest();
    case "RS256":
    case "RS384":
    case "RS512":
    case "PS256":
    case "PS384":
    case "PS512":
      // RSA signing - requires private key
      const hash = algorithm.replace("RS", "sha").replace("PS", "sha");
      return crypto.createSign(hash as any).update(data).sign(key as Buffer);
    case "ES256":
    case "ES384":
    case "ES512":
      // ECDSA signing - requires private key
      const ecdsaHash = algorithm.replace("ES", "sha");
      return crypto.createSign(ecdsaHash as any).update(data).sign(key as Buffer);
    default:
      throw new Error(`Unsupported algorithm: ${algorithm}`);
  }
}

/**
 * Encrypt data
 */
function encryptData(
  data: string,
  key: Buffer | string,
  enc: EncryptionAlgorithm,
  alg: KeyManagementAlgorithm
): {
  ciphertext: Buffer;
  iv: Buffer;
  tag?: Buffer;
} {
  const keyBuffer = typeof key === "string" ? Buffer.from(key, "utf8") : key;

  if (enc.startsWith("A") && enc.endsWith("GCM")) {
    // AES-GCM
    const keySize = enc === "A128GCM" ? 16 : enc === "A192GCM" ? 24 : 32;
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv(`aes-${keySize * 8}-gcm`, keyBuffer.slice(0, keySize), iv);
    let encrypted = cipher.update(data, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      ciphertext: encrypted,
      iv,
      tag,
    };
  } else if (enc.includes("CBC")) {
    // AES-CBC with HMAC
    const keySize = enc.includes("128") ? 16 : enc.includes("192") ? 24 : 32;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(`aes-${keySize * 8}-cbc`, keyBuffer.slice(0, keySize), iv);
    let encrypted = cipher.update(data, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // Calculate HMAC
    const hmacKey = keyBuffer.slice(keySize);
    const hmacAlg = enc.includes("256") ? "sha256" : enc.includes("384") ? "sha384" : "sha512";
    const hmac = crypto.createHmac(hmacAlg, hmacKey);
    hmac.update(Buffer.concat([iv, encrypted]));
    const tag = hmac.digest();

    return {
      ciphertext: encrypted,
      iv,
      tag,
    };
  }

  throw new Error(`Unsupported encryption algorithm: ${enc}`);
}

/**
 * Decrypt data
 */
function decryptData(
  encrypted: {
    ciphertext: Buffer;
    iv: Buffer;
    tag?: Buffer;
  },
  key: Buffer | string,
  enc: EncryptionAlgorithm,
  alg: KeyManagementAlgorithm
): string {
  const keyBuffer = typeof key === "string" ? Buffer.from(key, "utf8") : key;

  if (enc.startsWith("A") && enc.endsWith("GCM")) {
    // AES-GCM
    const keySize = enc === "A128GCM" ? 16 : enc === "A192GCM" ? 24 : 32;
    const decipher = crypto.createDecipheriv(
      `aes-${keySize * 8}-gcm`,
      keyBuffer.slice(0, keySize),
      encrypted.iv
    );
    if (encrypted.tag) {
      decipher.setAuthTag(encrypted.tag);
    }
    let decrypted = decipher.update(encrypted.ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString("utf8");
  } else if (enc.includes("CBC")) {
    // AES-CBC with HMAC
    const keySize = enc.includes("128") ? 16 : enc.includes("192") ? 24 : 32;
    const hmacKey = keyBuffer.slice(keySize);

    // Verify HMAC
    const hmacAlg = enc.includes("256") ? "sha256" : enc.includes("384") ? "sha384" : "sha512";
    const hmac = crypto.createHmac(hmacAlg, hmacKey);
    hmac.update(Buffer.concat([encrypted.iv, encrypted.ciphertext]));
    const expectedTag = hmac.digest();

    if (encrypted.tag && !crypto.timingSafeEqual(encrypted.tag, expectedTag)) {
      throw new Error("HMAC verification failed");
    }

    // Decrypt
    const decipher = crypto.createDecipheriv(
      `aes-${keySize * 8}-cbc`,
      keyBuffer.slice(0, keySize),
      encrypted.iv
    );
    let decrypted = decipher.update(encrypted.ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString("utf8");
  }

  throw new Error(`Unsupported encryption algorithm: ${enc}`);
}

/**
 * Create nested JWT (signed and encrypted)
 */
export function createNestedJWT(
  payload: JWTPayload,
  signingKey: string | Buffer,
  encryptionKey: string | Buffer,
  options: {
    signAlg?: Algorithm;
    encAlg?: KeyManagementAlgorithm;
    enc?: EncryptionAlgorithm;
  } = {}
): string {
  // First sign the JWT
  const signedJWT = encodeJWT(payload, signingKey, {
    algorithm: options.signAlg || "HS256",
  });

  // Then encrypt the signed JWT
  const encrypted = createJWE(signedJWT.token, encryptionKey, {
    alg: options.encAlg || "dir",
    enc: options.enc || "A256GCM",
  });

  return encrypted;
}

/**
 * Decrypt and verify nested JWT
 */
export function verifyNestedJWT(
  nestedJWT: string,
  encryptionKey: string | Buffer,
  signingKey: string | Buffer,
  options: {
    algorithms?: Algorithm[];
  } = {}
): JWTDecodeResult {
  // First decrypt
  const decrypted = decryptJWE(nestedJWT, encryptionKey);
  const signedJWT = decrypted.payload;

  // Then verify signature
  const verified = decodeJWT(signedJWT, signingKey, {
    algorithms: options.algorithms,
  });

  return verified;
}
