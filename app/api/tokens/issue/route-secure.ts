/**
 * Token Issuance Endpoint (Security Enhanced)
 * Issues JWT tokens for services with comprehensive security measures
 */

import { NextRequest, NextResponse } from "next/server";
import { issueToken, TokenIssuanceRequest } from "@/lib/services/auth/token-issuance-service";
import { serviceRegistry } from "@/lib/services/auth/service-registry";
import { logger } from "@/lib/logger";
import { authRateLimit } from "@/lib/security/rate-limit";
import { applySecurityHeaders } from "@/lib/security/security-headers";
import { sanitizeString, sanitizeEmail, validateRequestBody } from "@/lib/security/sanitize";
import { securityAudit } from "@/lib/security/audit-logger";
import { blacklistToken } from "@/lib/security/token-blacklist";
import { extractBindingFromRequest } from "@/lib/security/token-security";

/**
 * POST /api/tokens/issue
 * Issue token for service with security enhancements
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await authRateLimit(request);
  if (rateLimitResponse) {
    securityAudit.rateLimitExceeded({
      identifier: request.headers.get("x-forwarded-for") || "unknown",
      endpoint: "/api/tokens/issue",
      ip: request.headers.get("x-forwarded-for") || undefined,
    });
    return applySecurityHeaders(rateLimitResponse);
  }

  try {
    // Validate request body size and content type
    const bodyValidation = await validateRequestBody(request, 10 * 1024); // 10KB max
    if (!bodyValidation.valid) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: bodyValidation.error || "Invalid request body" },
          { status: 400 }
        )
      );
    }

    const body = bodyValidation.body as any;

    // Sanitize and validate input
    const userId = sanitizeString(body.userId || "", 100);
    const serviceId = sanitizeString(body.serviceId || "", 50);
    const clientId = body.clientId ? sanitizeString(body.clientId, 100) : undefined;
    const clientSecret = body.clientSecret ? sanitizeString(body.clientSecret, 200) : undefined;
    const scopes = Array.isArray(body.scopes)
      ? body.scopes.map((s: unknown) => sanitizeString(String(s || ""), 50)).filter(Boolean)
      : [];

    // Validate required fields
    if (!userId || !serviceId) {
      securityAudit.unauthorizedAccessAttempt({
        endpoint: "/api/tokens/issue",
        method: "POST",
        ip: request.headers.get("x-forwarded-for") || undefined,
        reason: "Missing required fields",
      });
      return applySecurityHeaders(
        NextResponse.json(
          { error: "userId and serviceId are required" },
          { status: 400 }
        )
      );
    }

    // Validate service
    if (!serviceRegistry.isEnabled(serviceId as any)) {
      securityAudit.unauthorizedAccessAttempt({
        endpoint: "/api/tokens/issue",
        method: "POST",
        ip: request.headers.get("x-forwarded-for") || undefined,
        reason: "Invalid or disabled service",
      });
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Service not found or disabled" },
          { status: 400 }
        )
      );
    }

    // Authenticate service (using service credentials or service token)
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      // Validate service credentials if provided
      if (clientId && clientSecret) {
        if (!serviceRegistry.validateCredentials(serviceId as any, clientId, clientSecret)) {
          securityAudit.authenticationFailed({
            userId,
            serviceId,
            ip: request.headers.get("x-forwarded-for") || undefined,
            reason: "Invalid service credentials",
          });
          return applySecurityHeaders(
            NextResponse.json(
              { error: "Invalid service credentials" },
              { status: 401 }
            )
          );
        }
      }
    } else {
      securityAudit.unauthorizedAccessAttempt({
        endpoint: "/api/tokens/issue",
        method: "POST",
        ip: request.headers.get("x-forwarded-for") || undefined,
        reason: "Missing authorization header",
      });
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Authorization required" },
          { status: 401 }
        )
      );
    }

    // Extract binding for token security
    const binding = extractBindingFromRequest(request);

    // Issue token
    const result = await issueToken({
      userId,
      serviceId: serviceId as any,
      scopes,
      expiresIn: body.expiresIn,
      clientId,
      clientSecret,
    } as TokenIssuanceRequest & { request: NextRequest });

    if (!result.success) {
      securityAudit.tokenValidationFailed({
        reason: result.error || "Token issuance failed",
        ip: request.headers.get("x-forwarded-for") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
      });
      return applySecurityHeaders(
        NextResponse.json(
          { error: result.error || "Token issuance failed" },
          { status: 400 }
        )
      );
    }

    // Log security event
    securityAudit.tokenIssued({
      userId,
      serviceId,
      tokenId: result.tokenId!,
      ip: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    // Log token issuance
    logger.info("Token issued via API", {
      userId,
      serviceId,
      tokenId: result.tokenId,
    });

    const response = NextResponse.json({
      success: true,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      tokenId: result.tokenId,
    });

    return applySecurityHeaders(response);
  } catch (error) {
    logger.error("Token issuance endpoint error", error);
    securityAudit.suspiciousActivity({
      description: "Token issuance endpoint error",
      ip: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
      details: { error: error instanceof Error ? error.message : "Unknown error" },
    });
    return applySecurityHeaders(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Internal server error" },
        { status: 500 }
      )
    );
  }
}
