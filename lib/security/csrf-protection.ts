/**
 * CSRF Protection
 * Implements CSRF token generation and validation
 */

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// In-memory CSRF token store (use Redis in production)
const csrfTokenStore = new Map<
  string,
  { token: string; expiresAt: number }
>();

const CSRF_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

/**
 * Generate CSRF token
 */
export function generateCSRFToken(sessionId?: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + CSRF_TOKEN_EXPIRY;

  if (sessionId) {
    csrfTokenStore.set(sessionId, { token, expiresAt });
  }

  return token;
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(
  token: string,
  sessionId?: string
): boolean {
  if (!token) {
    return false;
  }

  // If session ID provided, check against stored token
  if (sessionId) {
    const stored = csrfTokenStore.get(sessionId);
    if (!stored) {
      return false;
    }

    // Check expiry
    if (stored.expiresAt < Date.now()) {
      csrfTokenStore.delete(sessionId);
      return false;
    }

    // Constant-time comparison
    return constantTimeCompare(stored.token, token);
  }

  // If no session ID, we can't validate (shouldn't happen in production)
  return false;
}

/**
 * Constant-time string comparison
 */
function constantTimeCompare(a: string, b: string): boolean {
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
 * Extract CSRF token from request
 */
export function extractCSRFToken(request: NextRequest): string | null {
  // Check header first (preferred)
  const headerToken = request.headers.get("x-csrf-token");
  if (headerToken) {
    return headerToken;
  }

  // Check body for form submissions
  // Note: This requires async body parsing
  return null;
}

/**
 * CSRF protection middleware
 */
export function withCSRFProtection(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: {
    methods?: string[];
    skipValidation?: (req: NextRequest) => boolean;
  } = {}
) {
  const { methods = ["POST", "PUT", "DELETE", "PATCH"], skipValidation } =
    options;

  return async (req: NextRequest): Promise<NextResponse> => {
    // Skip CSRF check for safe methods
    if (!methods.includes(req.method)) {
      return handler(req);
    }

    // Skip if skipValidation returns true
    if (skipValidation && skipValidation(req)) {
      return handler(req);
    }

    // Get session ID from cookie or header
    const sessionId =
      req.cookies.get("sessionId")?.value ||
      req.headers.get("x-session-id");

    if (!sessionId) {
      logger.warn("CSRF validation failed: No session ID", {
        method: req.method,
        url: req.url,
      });
      return NextResponse.json(
        { error: "Session required for this operation" },
        { status: 403 }
      );
    }

    // Extract and validate CSRF token
    const token = extractCSRFToken(req);
    if (!token || !validateCSRFToken(token, sessionId)) {
      logger.warn("CSRF validation failed: Invalid token", {
        method: req.method,
        url: req.url,
        hasToken: !!token,
      });
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 }
      );
    }

    return handler(req);
  };
}

/**
 * Clean up expired CSRF tokens
 */
export function cleanupExpiredCSRFTokens(): void {
  const now = Date.now();
  for (const [sessionId, data] of csrfTokenStore.entries()) {
    if (data.expiresAt < now) {
      csrfTokenStore.delete(sessionId);
    }
  }
}

// Run cleanup every hour
if (typeof window === "undefined") {
  setInterval(cleanupExpiredCSRFTokens, 60 * 60 * 1000);
}
