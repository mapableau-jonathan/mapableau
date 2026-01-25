import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { apiRateLimit, paymentRateLimit } from "@/lib/security/rate-limit";
import { trackUsage } from "@/lib/middleware/usage-tracking";

/**
 * Security middleware
 * - Rate limiting
 * - Usage tracking
 * - Security headers
 */
export async function middleware(request: NextRequest) {
  // Rate limiting for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const rateLimitResult = await apiRateLimit(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Additional rate limiting for payment endpoints
    if (request.nextUrl.pathname.includes("/payment")) {
      const paymentLimitResult = await paymentRateLimit(request);
      if (paymentLimitResult) {
        return paymentLimitResult;
      }
    }
  }

  const response = NextResponse.next();

  // Track usage (non-blocking)
  if (process.env.USAGE_TRACKING_ENABLED === "true") {
    trackUsage(request, response).catch((error) => {
      // Silently fail - don't break requests if tracking fails
      console.warn("Usage tracking failed", error);
    });
  }

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Prevent exposure of sensitive verification evidence in public directory
  if (request.nextUrl.pathname.startsWith("/public/uploads/")) {
    // Block direct access to uploads directory
    // Verification documents should only be accessed via authenticated API endpoints
    return NextResponse.json(
      { error: "Direct access to uploads directory is not allowed" },
      { status: 403 }
    );
  }

  // CSP headers for XSS protection
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (but allow specific public assets)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
