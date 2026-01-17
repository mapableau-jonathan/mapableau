/**
 * Token Security Utilities
 * Advanced security features for JWT tokens including tampering detection,
 * token binding, replay prevention, and encryption
 */

import crypto from "crypto";
import { logger } from "@/lib/logger";

export interface TokenBinding {
  ip?: string;
  userAgent?: string;
  deviceId?: string;
  fingerprint?: string;
}

export interface TokenSecurityMetadata {
  jti: string; // JWT ID - unique token identifier for replay prevention
  binding?: TokenBinding;
  nonce?: string; // One-time use nonce
  issuedAt: number;
  rotationCount?: number; // Track token rotation
}

/**
 * Generate a cryptographically secure random token ID (JTI)
 */
export function generateTokenId(): string {
  return crypto.randomUUID();
}

/**
 * Generate a secure nonce for one-time use tokens
 */
export function generateNonce(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create device fingerprint from request headers
 * Used for token binding to prevent token theft
 */
export function createDeviceFingerprint(
  ip?: string | null,
  userAgent?: string | null,
  additionalHeaders?: Record<string, string | null>
): string {
  const components: string[] = [];

  if (ip) {
    // Normalize IP (remove port, handle IPv6)
    const normalizedIp = ip.split(":")[0].split(",")[0].trim();
    components.push(normalizedIp);
  }

  if (userAgent) {
    components.push(userAgent);
  }

  // Add additional headers if provided
  if (additionalHeaders) {
    Object.entries(additionalHeaders).forEach(([key, value]) => {
      if (value) {
        components.push(`${key}:${value}`);
      }
    });
  }

  // Create hash of fingerprint components
  const fingerprint = components.join("|");
  return crypto.createHash("sha256").update(fingerprint).digest("hex");
}

/**
 * Verify token binding - ensures token is used from same device/IP
 */
export function verifyTokenBinding(
  tokenBinding: TokenBinding | undefined,
  currentBinding: TokenBinding
): boolean {
  if (!tokenBinding) {
    // If no binding in token, allow (backward compatibility)
    return true;
  }

  // Verify IP binding (if present)
  if (tokenBinding.ip && currentBinding.ip) {
    const tokenIp = tokenBinding.ip.split(":")[0].split(",")[0].trim();
    const currentIp = currentBinding.ip.split(":")[0].split(",")[0].trim();
    if (tokenIp !== currentIp) {
      logger.warn("Token binding mismatch - IP changed", {
        tokenIp,
        currentIp,
      });
      return false;
    }
  }

  // Verify device fingerprint (if present)
  if (tokenBinding.fingerprint && currentBinding.fingerprint) {
    if (tokenBinding.fingerprint !== currentBinding.fingerprint) {
      logger.warn("Token binding mismatch - device fingerprint changed", {
        tokenFingerprint: tokenBinding.fingerprint.substring(0, 8),
        currentFingerprint: currentBinding.fingerprint.substring(0, 8),
      });
      return false;
    }
  }

  return true;
}

/**
 * Extract binding information from request
 */
export function extractBindingFromRequest(request: {
  headers: Headers | { get: (name: string) => string | null };
}): TokenBinding {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    null;

  const userAgent = request.headers.get("user-agent") || null;

  const fingerprint = createDeviceFingerprint(ip, userAgent, {
    "accept-language": request.headers.get("accept-language"),
    "accept-encoding": request.headers.get("accept-encoding"),
  });

  return {
    ip: ip || undefined,
    userAgent: userAgent || undefined,
    fingerprint,
  };
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Secure token comparison with timing attack prevention
 */
export function secureTokenCompare(token1: string, token2: string): boolean {
  return constantTimeCompare(token1, token2);
}

/**
 * Validate token format to prevent injection attacks
 */
export function validateTokenFormat(token: string): boolean {
  if (!token || typeof token !== "string") {
    return false;
  }

  // JWT format: header.payload.signature (3 parts separated by dots)
  const parts = token.split(".");
  if (parts.length !== 3) {
    return false;
  }

  // Each part should be base64url encoded
  const base64UrlRegex = /^[A-Za-z0-9_-]+$/;
  for (const part of parts) {
    if (!base64UrlRegex.test(part)) {
      return false;
    }
  }

  // Reasonable length check (prevent DoS)
  if (token.length > 8192) {
    return false;
  }

  return true;
}

/**
 * Rate limit key generator for token operations
 * Combines IP and user ID for more accurate rate limiting
 */
export function generateRateLimitKey(
  identifier: string,
  operation: string
): string {
  return `token:${operation}:${identifier}`;
}

/**
 * Check if token should be rotated based on age and usage
 */
export function shouldRotateToken(
  issuedAt: number,
  rotationInterval: number,
  rotationCount?: number
): boolean {
  const now = Math.floor(Date.now() / 1000);
  const age = now - issuedAt;

  // Rotate if token is older than rotation interval
  if (age >= rotationInterval) {
    return true;
  }

  // Rotate if token has been used too many times
  if (rotationCount !== undefined && rotationCount >= 100) {
    return true;
  }

  return false;
}

/**
 * Encrypt sensitive token data (for additional security layer)
 * Uses AES-256-GCM for authenticated encryption
 */
export function encryptTokenData(
  data: string,
  key: string
): { encrypted: string; iv: string; tag: string } {
  const algorithm = "aes-256-gcm";
  const iv = crypto.randomBytes(16);
  const keyBuffer = crypto.scryptSync(key, "salt", 32);

  const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
  };
}

/**
 * Decrypt token data
 */
export function decryptTokenData(
  encrypted: string,
  iv: string,
  tag: string,
  key: string
): string {
  const algorithm = "aes-256-gcm";
  const keyBuffer = crypto.scryptSync(key, "salt", 32);
  const ivBuffer = Buffer.from(iv, "hex");
  const tagBuffer = Buffer.from(tag, "hex");

  const decipher = crypto.createDecipheriv(algorithm, keyBuffer, ivBuffer);
  decipher.setAuthTag(tagBuffer);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
