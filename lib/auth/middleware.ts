/**
 * Authentication Middleware
 * Protects routes and validates JWT tokens
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken, extractTokenFromHeader } from "./jwt-service";
import { logger } from "@/lib/logger";

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    name?: string;
    role?: string;
    serviceAccess?: string[];
  };
}

/**
 * Authentication middleware for Next.js API routes
 * Validates JWT token and attaches user to request
 */
export function authenticate(
  request: NextRequest,
  options?: {
    required?: boolean;
    allowedRoles?: string[];
    allowedServices?: string[];
  }
): { user: any; error: null } | { user: null; error: NextResponse } {
  const { required = true, allowedRoles, allowedServices } = options || {};

  try {
    const authHeader = request.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      if (required) {
        return {
          user: null,
          error: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
        };
      }
      return { user: null, error: null };
    }

    const payload = verifyToken(token);
    const user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      serviceAccess: payload.serviceAccess || [],
    };

    // Check role authorization
    if (allowedRoles && allowedRoles.length > 0) {
      if (!user.role || !allowedRoles.includes(user.role)) {
        return {
          user: null,
          error: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }),
        };
      }
    }

    // Check service access
    if (allowedServices && allowedServices.length > 0) {
      const hasAccess = allowedServices.some((service) => user.serviceAccess?.includes(service));
      if (!hasAccess) {
        return {
          user: null,
          error: NextResponse.json(
            { error: "Access denied to requested service" },
            { status: 403 }
          ),
        };
      }
    }

    return { user, error: null };
  } catch (error) {
    logger.error("Authentication middleware error", error);
    if (required) {
      return {
        user: null,
        error: NextResponse.json(
          { error: error instanceof Error ? error.message : "Authentication failed" },
          { status: 401 }
        ),
      };
    }
    return { user: null, error: null };
  }
}

/**
 * Higher-order function to protect API routes
 */
export function withAuth(
  handler: (req: AuthenticatedRequest, context?: any) => Promise<NextResponse>,
  options?: {
    required?: boolean;
    allowedRoles?: string[];
    allowedServices?: string[];
  }
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const authResult = authenticate(req, options);

    if (authResult.error) {
      return authResult.error;
    }

    const authenticatedReq = req as AuthenticatedRequest;
    authenticatedReq.user = authResult.user || undefined;

    return handler(authenticatedReq, context);
  };
}

/**
 * Service-specific authentication middleware
 * Validates access to specific Australian Disability Ltd services
 */
export const serviceAuth = {
  care: (req: NextRequest) =>
    authenticate(req, { allowedServices: ["care", "all"] }),
  transport: (req: NextRequest) =>
    authenticate(req, { allowedServices: ["transport", "all"] }),
  jobs: (req: NextRequest) =>
    authenticate(req, { allowedServices: ["jobs", "all"] }),
  marketplace: (req: NextRequest) =>
    authenticate(req, { allowedServices: ["marketplace", "all"] }),
  abilitypay: (req: NextRequest) =>
    authenticate(req, { allowedServices: ["abilitypay", "all"] }),
  compliance: (req: NextRequest) =>
    authenticate(req, { allowedServices: ["compliance", "all"], allowedRoles: ["NDIA_ADMIN", "PROVIDER"] }),
};
