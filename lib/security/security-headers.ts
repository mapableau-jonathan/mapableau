/**
 * Security Headers Middleware
 * Adds security headers to responses to prevent common attacks
 */

import { NextRequest, NextResponse } from "next/server";

export interface SecurityHeadersConfig {
  enableCSP?: boolean;
  enableHSTS?: boolean;
  enableXFrameOptions?: boolean;
  enableXContentTypeOptions?: boolean;
  enableReferrerPolicy?: boolean;
  enablePermissionsPolicy?: boolean;
  customHeaders?: Record<string, string>;
}

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(
  response: NextResponse,
  config: SecurityHeadersConfig = {}
): NextResponse {
  const {
    enableCSP = true,
    enableHSTS = true,
    enableXFrameOptions = true,
    enableXContentTypeOptions = true,
    enableReferrerPolicy = true,
    enablePermissionsPolicy = true,
    customHeaders = {},
  } = config;

  // Content Security Policy
  if (enableCSP) {
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'self';"
    );
  }

  // HTTP Strict Transport Security
  if (enableHSTS) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // X-Frame-Options (prevent clickjacking)
  if (enableXFrameOptions) {
    response.headers.set("X-Frame-Options", "DENY");
  }

  // X-Content-Type-Options (prevent MIME sniffing)
  if (enableXContentTypeOptions) {
    response.headers.set("X-Content-Type-Options", "nosniff");
  }

  // Referrer Policy
  if (enableReferrerPolicy) {
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  }

  // Permissions Policy (formerly Feature Policy)
  if (enablePermissionsPolicy) {
    response.headers.set(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
    );
  }

  // X-XSS-Protection (legacy but still useful)
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Remove server information
  response.headers.delete("X-Powered-By");
  response.headers.delete("Server");

  // Apply custom headers
  Object.entries(customHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

/**
 * Security headers middleware for Next.js API routes
 */
export function withSecurityHeaders(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: SecurityHeadersConfig
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const response = await handler(req);
    return applySecurityHeaders(response, config);
  };
}

/**
 * CORS configuration with security
 */
export function configureCORS(
  response: NextResponse,
  allowedOrigins: string[] = ["*"]
): NextResponse {
  const origin = response.headers.get("origin") || "";

  if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin || "*");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, X-CSRF-Token"
    );
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Max-Age", "86400");
  }

  return response;
}
