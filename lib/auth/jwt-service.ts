/**
 * JWT Token Service
 * Centralized JWT token generation and validation for all services
 * Enhanced with security features: token binding, replay prevention, tampering detection
 */

import jwt from "jsonwebtoken";
import { getEnv } from "@/lib/config/env";
import { logger } from "@/lib/logger";
import {
  generateTokenId,
  TokenBinding,
  validateTokenFormat,
  extractBindingFromRequest,
} from "@/lib/security/token-security";
import { isTokenBlacklisted } from "@/lib/security/token-blacklist";

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
 * Generate JWT access token with security enhancements
 */
export function generateAccessToken(
  payload: Omit<JWTPayload, "iat" | "exp" | "iss" | "aud" | "jti">,
  options?: {
    binding?: TokenBinding;
    request?: { headers: Headers | { get: (name: string) => string | null } };
  }
): string {
  const secret = process.env.JWT_SECRET || env.NEXTAUTH_SECRET;
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

  return jwt.sign(tokenPayload, secret, {
    expiresIn,
    algorithm: "HS256",
    jwtid: jti, // Set JWT ID claim
  });
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(userId: string): string {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || env.NEXTAUTH_SECRET;
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "7d"; // 7 days default

  return jwt.sign({ sub: userId, type: "refresh" }, secret, {
    expiresIn,
    algorithm: "HS256",
  });
}

/**
 * Generate token pair (access + refresh) with security enhancements
 */
export function generateTokenPair(
  payload: Omit<JWTPayload, "iat" | "exp" | "iss" | "aud" | "jti">,
  options?: {
    binding?: TokenBinding;
    request?: { headers: Headers | { get: (name: string) => string | null } };
  }
): TokenPair {
  const accessToken = generateAccessToken(payload, options);
  const refreshToken = generateRefreshToken(payload.sub);

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
 * Verify and decode JWT token (synchronous version for backward compatibility)
 */
export function verifyToken(token: string): JWTPayload {
  // Validate token format first (prevent injection attacks)
  if (!validateTokenFormat(token)) {
    throw new Error("Invalid token format");
  }

  const secret = process.env.JWT_SECRET || env.NEXTAUTH_SECRET;
  const issuer = process.env.JWT_ISSUER || "australian-disability-ltd";
  const audience = process.env.JWT_AUDIENCE || "australian-disability-services";

  try {
    const decoded = jwt.verify(token, secret, {
      issuer,
      audience,
      algorithms: ["HS256"],
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Token expired");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Invalid token");
    }
    logger.error("Token verification error", error);
    throw new Error("Token verification failed");
  }
}

/**
 * Verify and decode JWT token with enhanced security checks (async version)
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

  const secret = process.env.JWT_SECRET || env.NEXTAUTH_SECRET;
  const issuer = process.env.JWT_ISSUER || "australian-disability-ltd";
  const audience = process.env.JWT_AUDIENCE || "australian-disability-services";

  try {
    const decoded = jwt.verify(token, secret, {
      issuer,
      audience,
      algorithms: ["HS256"],
    }) as JWTPayload;

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
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Token expired");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Invalid token");
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
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): { sub: string } {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || env.NEXTAUTH_SECRET;

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    }) as { sub: string; type: string };

    if (decoded.type !== "refresh") {
      throw new Error("Invalid token type");
    }

    return { sub: decoded.sub };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Refresh token expired");
    }
    if (error instanceof jwt.JsonWebTokenError) {
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
