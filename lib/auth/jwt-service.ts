/**
 * JWT Token Service (JOSE Implementation)
 * Centralized JWT/JWE token generation and validation using JOSE standards
 * Enhanced with security features: token binding, replay prevention, tampering detection, encryption
 * 
 * Migrated from jsonwebtoken to jose for:
 * - Better security (JOSE standard compliance)
 * - Native async/await support
 * - Built-in encryption support (JWE)
 * - Better key management
 * - Edge runtime compatibility
 */

import * as jose from "jose";
import { getEnv } from "@/lib/config/env";
import { logger } from "@/lib/logger";
import {
  generateTokenId,
  TokenBinding,
  validateTokenFormat,
  extractBindingFromRequest,
} from "@/lib/security/token-security";
import { isTokenBlacklisted } from "@/lib/security/token-blacklist";
import { keyManager } from "./jose-key-manager";

const env = getEnv();

export interface JWTPayload {
  sub: string; // User ID
  email: string;
  name?: string;
  role?: string;
  serviceAccess?: string[]; // Services the user can access
  jti?: string; // JWT ID - unique token identifier for replay prevention
  binding?: TokenBinding; // Token binding for device/IP verification
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Generate JWT access token with security enhancements (JOSE implementation)
 */
export async function generateAccessToken(
  payload: Omit<JWTPayload, "iat" | "exp" | "iss" | "aud" | "jti">,
  options?: {
    binding?: TokenBinding;
    request?: { headers: Headers | { get: (name: string) => string | null } };
    encrypt?: boolean; // Optionally encrypt the token (JWE)
  }
): Promise<string> {
  const expiresIn = process.env.JWT_EXPIRES_IN || "15m"; // 15 minutes default
  const issuer = process.env.JWT_ISSUER || "australian-disability-ltd";
  const audience = process.env.JWT_AUDIENCE || "australian-disability-services";

  // Generate unique token ID for replay prevention
  const jti = generateTokenId();

  // Extract binding from request if provided
  let binding = options?.binding;
  if (!binding && options?.request) {
    binding = extractBindingFromRequest(options.request);
  }

  const tokenPayload: JWTPayload = {
    ...payload,
    jti,
    binding,
    iss: issuer,
    aud: audience,
  };

  const signingKey = await keyManager.getSigningKey();

  // If encryption is requested, create a JWE (JSON Web Encryption) token
  if (options?.encrypt) {
    const encryptionKey = await keyManager.getEncryptionKey();
    return await new jose.EncryptJWT(tokenPayload)
      .setProtectedHeader({
        alg: "dir", // Direct encryption with shared key
        enc: "A256GCM", // AES-256-GCM encryption
      })
      .setIssuedAt()
      .setIssuer(issuer)
      .setAudience(audience)
      .setExpirationTime(expiresIn)
      .setJti(jti)
      .encrypt(encryptionKey);
  }

  // Otherwise, create a signed JWT (JWS)
  return await new jose.SignJWT(tokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(issuer)
    .setAudience(audience)
    .setExpirationTime(expiresIn)
    .setJti(jti)
    .sign(signingKey);
}

/**
 * Generate JWT refresh token (JOSE implementation)
 */
export async function generateRefreshToken(userId: string): Promise<string> {
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "7d"; // 7 days default
  const issuer = process.env.JWT_ISSUER || "australian-disability-ltd";

  const refreshKey = await keyManager.getRefreshSigningKey();

  return await new jose.SignJWT({ sub: userId, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(issuer)
    .setExpirationTime(expiresIn)
    .sign(refreshKey);
}

/**
 * Generate token pair (access + refresh) with security enhancements (JOSE implementation)
 */
export async function generateTokenPair(
  payload: Omit<JWTPayload, "iat" | "exp" | "iss" | "aud" | "jti">,
  options?: {
    binding?: TokenBinding;
    request?: { headers: Headers | { get: (name: string) => string | null } };
    encrypt?: boolean;
  }
): Promise<TokenPair> {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(payload, options),
    generateRefreshToken(payload.sub),
  ]);

  // Calculate expiration time in seconds
  const expiresIn = process.env.JWT_EXPIRES_IN || "15m";
  const expiresInSeconds = parseExpiresIn(expiresIn);

  return {
    accessToken,
    refreshToken,
    expiresIn: expiresInSeconds,
  };
}

/**
 * Verify and decode JWT token (JOSE implementation)
 * Note: JOSE is async-only, so this function is now async
 * For backward compatibility, use verifyTokenSecure which is already async
 */
export async function verifyToken(token: string): Promise<JWTPayload> {
  // Validate token format first (prevent injection attacks)
  if (!validateTokenFormat(token)) {
    throw new Error("Invalid token format");
  }

  const issuer = process.env.JWT_ISSUER || "australian-disability-ltd";
  const audience = process.env.JWT_AUDIENCE || "australian-disability-services";
  const signingKey = await keyManager.getSigningKey();

  try {
    // Try to verify as JWE (encrypted token) first
    try {
      const encryptionKey = await keyManager.getEncryptionKey();
      const { payload } = await jose.jwtDecrypt(token, encryptionKey, {
        issuer,
        audience,
      });
      return payload as JWTPayload;
    } catch (jweError) {
      // If not JWE, try as JWS (signed token)
      const { payload } = await jose.jwtVerify(token, signingKey, {
        issuer,
        audience,
      });
      return payload as JWTPayload;
    }
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      throw new Error("Token expired");
    }
    if (error instanceof jose.errors.JWTInvalid) {
      throw new Error("Invalid token");
    }
    if (error instanceof jose.errors.JWEDecryptionFailed) {
      throw new Error("Token decryption failed");
    }
    logger.error("Token verification error", error);
    throw new Error("Token verification failed");
  }
}

/**
 * Verify and decode JWT token with enhanced security checks (JOSE implementation)
 */
export async function verifyTokenSecure(
  token: string,
  options?: {
    checkBlacklist?: boolean;
    verifyBinding?: boolean;
    request?: { headers: Headers | { get: (name: string) => string | null } };
  }
): Promise<JWTPayload> {
  // Validate token format first (prevent injection attacks)
  if (!validateTokenFormat(token)) {
    throw new Error("Invalid token format");
  }

  const issuer = process.env.JWT_ISSUER || "australian-disability-ltd";
  const audience = process.env.JWT_AUDIENCE || "australian-disability-services";
  const signingKey = await keyManager.getSigningKey();

  try {
    let decoded: JWTPayload;

    // Try to verify as JWE (encrypted token) first
    try {
      const encryptionKey = await keyManager.getEncryptionKey();
      const { payload } = await jose.jwtDecrypt(token, encryptionKey, {
        issuer,
        audience,
      });
      decoded = payload as JWTPayload;
    } catch (jweError) {
      // If not JWE, try as JWS (signed token)
      const { payload } = await jose.jwtVerify(token, signingKey, {
        issuer,
        audience,
      });
      decoded = payload as JWTPayload;
    }

    // Check blacklist if enabled
    if (options?.checkBlacklist !== false && decoded.jti) {
      const blacklisted = await isTokenBlacklisted(decoded.jti);
      if (blacklisted) {
        throw new Error("Token has been revoked");
      }
    }

    // Verify token binding if enabled
    if (options?.verifyBinding && decoded.binding && options.request) {
      const { verifyTokenBinding, extractBindingFromRequest } = await import(
        "@/lib/security/token-security"
      );
      const currentBinding = extractBindingFromRequest(options.request);
      if (!verifyTokenBinding(decoded.binding, currentBinding)) {
        throw new Error("Token binding mismatch - possible token theft");
      }
    }

    return decoded;
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      throw new Error("Token expired");
    }
    if (error instanceof jose.errors.JWTInvalid) {
      throw new Error("Invalid token");
    }
    if (error instanceof jose.errors.JWEDecryptionFailed) {
      throw new Error("Token decryption failed");
    }
    if (error instanceof Error && error.message.includes("revoked")) {
      throw error;
    }
    if (error instanceof Error && error.message.includes("binding")) {
      throw error;
    }
    logger.error("Token verification error", error);
    throw new Error("Token verification failed");
  }
}

/**
 * Verify refresh token (JOSE implementation)
 */
export async function verifyRefreshToken(token: string): Promise<{ sub: string }> {
  const issuer = process.env.JWT_ISSUER || "australian-disability-ltd";
  const refreshKey = await keyManager.getRefreshSigningKey();

  try {
    const { payload } = await jose.jwtVerify(token, refreshKey, {
      issuer,
    });

    const decoded = payload as { sub: string; type: string };

    if (decoded.type !== "refresh") {
      throw new Error("Invalid token type");
    }

    return { sub: decoded.sub };
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      throw new Error("Refresh token expired");
    }
    if (error instanceof jose.errors.JWTInvalid) {
      throw new Error("Invalid refresh token");
    }
    logger.error("Refresh token verification error", error);
    throw new Error("Refresh token verification failed");
  }
}

/**
 * Parse expiresIn string to seconds
 */
function parseExpiresIn(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) {
    return 900; // Default to 15 minutes
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "s":
      return value;
    case "m":
      return value * 60;
    case "h":
      return value * 60 * 60;
    case "d":
      return value * 24 * 60 * 60;
    default:
      return 900;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }

  return parts[1];
}
