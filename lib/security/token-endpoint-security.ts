/**
 * Token Endpoint Security Wrapper
 * Comprehensive security middleware for token-related endpoints
 */

import { NextRequest, NextResponse } from "next/server";
import { authRateLimit, strictRateLimit } from "./rate-limit";
import { applySecurityHeaders } from "./security-headers";
import { sanitizeString, validateRequestBody } from "./sanitize";
import { securityAudit } from "./audit-logger";
import { extractBindingFromRequest } from "./token-security";
import { validateTokenFormat } from "./token-security";

export interface SecureEndpointOptions {
  rateLimit?: "auth" | "strict" | "none";
  requireAuth?: boolean;
  maxBodySize?: number;
  enableCSRF?: boolean;
  enableTokenBinding?: boolean;
}

/**
 * Secure wrapper for token endpoints
 */
export function withTokenEndpointSecurity(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: SecureEndpointOptions = {}
) {
  const {
    rateLimit: rateLimitType = "auth",
    requireAuth = false,
    maxBodySize = 10 * 1024, // 10KB default
    enableCSRF = false,
    enableTokenBinding = false,
  } = options;

  return async (req: NextRequest): Promise<NextResponse> => {
    // Apply rate limiting
    if (rateLimitType !== "none") {
      const rateLimitFn = rateLimitType === "strict" ? strictRateLimit : authRateLimit;
      const rateLimitResponse = await rateLimitFn(req);
      if (rateLimitResponse) {
        securityAudit.rateLimitExceeded({
          identifier: req.headers.get("x-forwarded-for") || "unknown",
          endpoint: req.nextUrl.pathname,
          ip: req.headers.get("x-forwarded-for") || undefined,
        });
        return applySecurityHeaders(rateLimitResponse);
      }
    }

    // Validate request body for POST/PUT/PATCH
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      const bodyValidation = await validateRequestBody(req, maxBodySize);
      if (!bodyValidation.valid) {
        return applySecurityHeaders(
          NextResponse.json(
            { error: bodyValidation.error || "Invalid request body" },
            { status: 400 }
          )
        );
      }
    }

    // CSRF protection (if enabled)
    if (enableCSRF) {
      const { validateCSRFToken, extractCSRFToken } = await import("./csrf-protection");
      const sessionId = req.cookies.get("sessionId")?.value;
      const csrfToken = extractCSRFToken(req);
      
      if (!sessionId || !csrfToken || !validateCSRFToken(csrfToken, sessionId)) {
        securityAudit.csrfViolation({
          endpoint: req.nextUrl.pathname,
          ip: req.headers.get("x-forwarded-for") || undefined,
          userAgent: req.headers.get("user-agent") || undefined,
        });
        return applySecurityHeaders(
          NextResponse.json(
            { error: "Invalid CSRF token" },
            { status: 403 }
          )
        );
      }
    }

    // Execute handler with error handling
    try {
      const response = await handler(req);
      return applySecurityHeaders(response);
    } catch (error) {
      logger.error("Token endpoint error", {
        endpoint: req.nextUrl.pathname,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      securityAudit.suspiciousActivity({
        description: `Error in ${req.nextUrl.pathname}`,
        ip: req.headers.get("x-forwarded-for") || undefined,
        userAgent: req.headers.get("user-agent") || undefined,
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      });

      return applySecurityHeaders(
        NextResponse.json(
          { error: error instanceof Error ? error.message : "Internal server error" },
          { status: 500 }
        )
      );
    }
  };
}

/**
 * Validate and sanitize token input
 */
export function validateTokenInput(
  token: unknown,
  serviceId: unknown
): { valid: boolean; token?: string; serviceId?: string; error?: string } {
  if (typeof token !== "string" || !token) {
    return { valid: false, error: "Token must be a non-empty string" };
  }

  if (!validateTokenFormat(token)) {
    return { valid: false, error: "Invalid token format" };
  }

  if (typeof serviceId !== "string" || !serviceId) {
    return { valid: false, error: "Service ID must be a non-empty string" };
  }

  const sanitizedToken = sanitizeString(token, 8192); // Max JWT length
  const sanitizedServiceId = sanitizeString(serviceId, 50);

  return {
    valid: true,
    token: sanitizedToken,
    serviceId: sanitizedServiceId,
  };
}

/**
 * Extract and validate token from request
 */
export function extractAndValidateToken(
  req: NextRequest
): { token: string | null; error?: string } {
  // Try Authorization header first
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer") {
      const token = parts[1];
      if (validateTokenFormat(token)) {
        return { token };
      }
      return { token: null, error: "Invalid token format in Authorization header" };
    }
    return { token: null, error: "Invalid Authorization header format" };
  }

  // Try body for POST requests
  if (req.method === "POST") {
    // Body parsing is handled separately
    return { token: null, error: "Token not found in request" };
  }

  return { token: null, error: "Token not found in request" };
}

import { logger } from "@/lib/logger";
