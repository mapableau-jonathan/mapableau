/**
 * JWT Pipe Service
 * Bidirectional JWT integration with MediaWiki and Wix
 * Enables JWT-based SSO in both directions:
 * - Outbound: Issue JWTs for MediaWiki/Wix to validate
 * - Inbound: Validate JWTs from MediaWiki/Wix
 */

import { JWTPayload } from "@/lib/auth/jwt-service";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ServiceId, serviceRegistry } from "./service-registry";
import { issueToken, TokenIssuanceResult } from "./token-issuance-service";
import { linkAccount } from "./account-linker";
import { normalizeProfile } from "./profile-normalizer";
import * as jose from "jose";
import crypto from "crypto";

export type JWTProvider = "mediawiki" | "wix";

export interface JWTProviderConfig {
  issuer: string; // Our issuer for outbound JWTs
  audience: string; // MediaWiki/Wix audience for outbound JWTs
  secret: string; // Shared secret for JWT signing/verification
  inboundIssuer?: string; // MediaWiki/Wix issuer for inbound JWTs
  inboundAudience?: string; // Our audience for inbound JWTs
  inboundSecret?: string; // Secret for validating inbound JWTs (can differ from outbound)
}

export interface OutboundJWTRequest {
  userId: string;
  provider: JWTProvider;
  serviceId?: ServiceId;
  additionalClaims?: Record<string, any>;
}

export interface OutboundJWTResult {
  success: boolean;
  token?: string;
  expiresIn?: number;
  error?: string;
}

export interface InboundJWTRequest {
  token: string;
  provider: JWTProvider;
  serviceId?: ServiceId;
}

export interface InboundJWTResult {
  success: boolean;
  userId?: string;
  tokens?: TokenIssuanceResult;
  profile?: {
    id: string;
    email: string;
    name?: string;
    image?: string;
  };
  error?: string;
}

/**
 * Get JWT provider configuration from environment
 */
function getJWTProviderConfig(provider: JWTProvider): JWTProviderConfig | null {
  const env = process.env;
  const baseUrl = process.env.AD_ID_DOMAIN || process.env.NEXTAUTH_URL || "";

  switch (provider) {
    case "mediawiki": {
      const secret = env.MEDIAWIKI_JWT_SECRET || env.JWT_SECRET;
      const inboundSecret = env.MEDIAWIKI_JWT_INBOUND_SECRET || secret;
      const issuer = env.MEDIAWIKI_JWT_ISSUER || baseUrl;
      const audience = env.MEDIAWIKI_JWT_AUDIENCE || "mediawiki";
      const inboundIssuer = env.MEDIAWIKI_JWT_INBOUND_ISSUER || "mediawiki";
      const inboundAudience = env.MEDIAWIKI_JWT_INBOUND_AUDIENCE || baseUrl;

      if (!secret) {
        logger.warn("MediaWiki JWT secret not configured");
        return null;
      }

      return {
        issuer,
        audience,
        secret,
        inboundIssuer,
        inboundAudience,
        inboundSecret,
      };
    }

    case "wix": {
      const secret = env.WIX_JWT_SECRET || env.JWT_SECRET;
      const inboundSecret = env.WIX_JWT_INBOUND_SECRET || secret;
      const issuer = env.WIX_JWT_ISSUER || baseUrl;
      const audience = env.WIX_JWT_AUDIENCE || "wix";
      const inboundIssuer = env.WIX_JWT_INBOUND_ISSUER || "wix";
      const inboundAudience = env.WIX_JWT_INBOUND_AUDIENCE || baseUrl;

      if (!secret) {
        logger.warn("Wix JWT secret not configured");
        return null;
      }

      return {
        issuer,
        audience,
        secret,
        inboundIssuer,
        inboundAudience,
        inboundSecret,
      };
    }

    default:
      return null;
  }
}

/**
 * Issue JWT token for MediaWiki/Wix (outbound)
 */
export async function issueOutboundJWT(
  request: OutboundJWTRequest
): Promise<OutboundJWTResult> {
  try {
    const config = getJWTProviderConfig(request.provider);
    if (!config) {
      return {
        success: false,
        error: `JWT not configured for provider: ${request.provider}`,
      };
    }

    // Get user information
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        image: true,
      },
    });

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Build JWT payload with provider-specific claims
    const payload: Omit<JWTPayload, "iat" | "exp" | "iss" | "aud" | "jti"> = {
      sub: user.id,
      email: user.email,
      name: user.name || undefined,
      role: user.role || undefined,
      ...request.additionalClaims,
    };

    // For MediaWiki, add MediaWiki-specific claims
    if (request.provider === "mediawiki") {
      // MediaWiki may expect additional fields like user_id, groups, etc.
      (payload as any).mediawiki_user_id = user.id;
      (payload as any).groups = []; // Can be populated from user data
    }

    // For Wix, add Wix-specific claims
    if (request.provider === "wix") {
      // Wix may expect additional fields like member_id, etc.
      (payload as any).wix_member_id = user.id;
    }

    // Generate JWT with provider-specific configuration
    // Note: We use the standard JWT service but with provider-specific secret
    // In a full implementation, you might want separate JWT generation for each provider
    
    // For now, we'll use the standard JWT service but need to pass custom secret
    // This requires modifying jwt-service or creating provider-specific token generation
    
    // Temporary: Store provider secret and use it for token generation
    // In production, you might want to use separate JWT services per provider
    
    // Generate JWT with provider-specific secret
    const secretBytes = new TextEncoder().encode(config.secret);
    const signingKey = await jose.importKey(
      secretBytes,
      { name: "HMAC", hash: "SHA-256" },
      { extractable: false }
    );

    // Get expiration time
    const expiresIn = request.provider === "mediawiki" 
      ? (process.env.MEDIAWIKI_JWT_EXPIRES_IN || "1h") 
      : (process.env.WIX_JWT_EXPIRES_IN || "1h");

    const jti = crypto.randomUUID();

    // Generate JWT with provider-specific issuer and audience
    const token = await new jose.SignJWT({
      ...payload,
      jti,
    } as any)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setIssuer(config.issuer)
      .setAudience(config.audience)
      .setExpirationTime(expiresIn)
      .setJti(jti)
      .sign(signingKey);

    // Calculate expiration
    const expiresInSeconds = parseExpiresIn(expiresIn);

    logger.info("Outbound JWT issued", {
      provider: request.provider,
      userId: request.userId,
      expiresIn: expiresInSeconds,
    });

    return {
      success: true,
      token,
      expiresIn: expiresInSeconds,
    };
  } catch (error) {
    logger.error("Outbound JWT issuance error", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "JWT issuance failed",
    };
  }
}

/**
 * Parse expiresIn string to seconds
 */
function parseExpiresIn(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 3600; // Default 1 hour

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "s":
      return value;
    case "m":
      return value * 60;
    case "h":
      return value * 3600;
    case "d":
      return value * 86400;
    default:
      return 3600;
  }
}

/**
 * Validate JWT token from MediaWiki/Wix (inbound)
 */
export async function validateInboundJWT(
  request: InboundJWTRequest
): Promise<InboundJWTResult> {
  try {
    const config = getJWTProviderConfig(request.provider);
    if (!config) {
      return {
        success: false,
        error: `JWT not configured for provider: ${request.provider}`,
      };
    }

    // Verify JWT token with provider-specific secret
    const secretBytes = new TextEncoder().encode(config.inboundSecret || config.secret);
    const signingKey = await jose.importKey(
      secretBytes,
      { name: "HMAC", hash: "SHA-256" },
      { extractable: false }
    );

    // Verify JWT with provider-specific issuer and audience
    const { payload } = await jose.jwtVerify(request.token, signingKey, {
      issuer: config.inboundIssuer || config.issuer,
      audience: config.inboundAudience || config.audience,
    }) as { payload: JWTPayload };

    // Validate provider-specific claims
    if (request.provider === "mediawiki") {
      // Validate MediaWiki-specific issuer/audience if configured
      if (config.inboundIssuer && payload.iss !== config.inboundIssuer) {
        return {
          success: false,
          error: "Invalid JWT issuer for MediaWiki",
        };
      }
    }

    if (request.provider === "wix") {
      // Validate Wix-specific issuer/audience if configured
      if (config.inboundIssuer && payload.iss !== config.inboundIssuer) {
        return {
          success: false,
          error: "Invalid JWT issuer for Wix",
        };
      }
    }

    // Extract user information from JWT payload
    const email = payload.email;
    if (!email) {
      return {
        success: false,
        error: "Email not found in JWT payload",
      };
    }

    // Find or create user
    const userId = payload.sub;
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    // If user not found by ID, try by email
    if (!user) {
      user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
    }

    // Normalize profile from JWT payload
    const normalizedProfile = normalizeProfile(request.provider, {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      image: undefined, // JWTs typically don't include images
      ...payload,
    });

    // Link account if user exists, otherwise create new user
    const serviceId = request.serviceId || "mapable";
    const linkResult = await linkAccount(normalizedProfile, false);

    if (!linkResult.success || !linkResult.userId) {
      return {
        success: false,
        error: linkResult.error || "Failed to link account",
      };
    }

    // Ensure service link exists
    await ensureServiceLink(linkResult.userId, serviceId);

    // Issue service tokens
    const service = serviceRegistry.get(serviceId);
    const tokenResult = await issueToken({
      userId: linkResult.userId,
      serviceId,
      scopes: service?.allowedScopes || ["read:profile", "read:email"],
    });

    if (!tokenResult.success) {
      return {
        success: false,
        error: tokenResult.error || "Failed to issue tokens",
      };
    }

    logger.info("Inbound JWT validated and processed", {
      provider: request.provider,
      userId: linkResult.userId,
      email: normalizedProfile.email,
    });

    return {
      success: true,
      userId: linkResult.userId,
      tokens: tokenResult,
      profile: {
        id: normalizedProfile.providerAccountId,
        email: normalizedProfile.email,
        name: normalizedProfile.name,
        image: normalizedProfile.image,
      },
    };
  } catch (error) {
    logger.error("Inbound JWT validation error", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "JWT validation failed",
    };
  }
}

/**
 * Ensure service link exists for user
 */
async function ensureServiceLink(userId: string, serviceId: ServiceId): Promise<void> {
  const existingLink = await prisma.serviceLink.findFirst({
    where: {
      userId,
      serviceId,
    },
  });

  if (!existingLink) {
    await prisma.serviceLink.create({
      data: {
        userId,
        serviceId,
        isActive: true,
        preferences: {},
      },
    });
  }
}
