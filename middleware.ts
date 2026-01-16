import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { apiRateLimit, paymentRateLimit } from "@/lib/security/rate-limit";

/**
 * Security middleware
 * Adds security headers, rate limiting, and basic protections
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Apply rate limiting to API routes
  if (pathname.startsWith("/api/abilitypay/payments")) {
    const rateLimitResponse = await paymentRateLimit(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
  } else if (pathname.startsWith("/api/")) {
    const rateLimitResponse = await apiRateLimit(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
  }

  const response = NextResponse.next();

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()"
  );

  // Content Security Policy
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.commerce.coinbase.com https://*.infura.io wss://*.infura.io;"
    );
  }

  // HSTS (HTTP Strict Transport Security) - only in production
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
