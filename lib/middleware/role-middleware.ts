/**
 * Role-Based Access Control Middleware
 * Enforces role-based permissions for API routes and pages
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { UserRole } from "@prisma/client";

export type Role = UserRole | string;

export interface RoleMiddlewareOptions {
  requiredRoles?: Role[];
  allowSelf?: boolean; // Allow access to own resources
  userIdParam?: string; // Parameter name for user ID in route
}

/**
 * Check if user has required role
 */
export function hasRole(userRole: Role | null | undefined, requiredRoles: Role[]): boolean {
  if (!userRole) return false;
  return requiredRoles.includes(userRole);
}

/**
 * Role-based middleware for API routes
 */
export async function withRole(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  options: RoleMiddlewareOptions = {}
): Promise<(req: NextRequest, context?: any) => Promise<NextResponse>> {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      const session = await getSession(req);
      
      if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      // Check role if required
      if (options.requiredRoles && options.requiredRoles.length > 0) {
        const hasRequiredRole = hasRole(session.role, options.requiredRoles);
        
        // Allow self-access if configured
        if (!hasRequiredRole && options.allowSelf && options.userIdParam) {
          const userId = context?.params?.[options.userIdParam] || 
                        new URL(req.url).searchParams.get(options.userIdParam);
          
          if (userId !== session.userId) {
            return NextResponse.json(
              { error: "Insufficient permissions" },
              { status: 403 }
            );
          }
        } else if (!hasRequiredRole) {
          return NextResponse.json(
            { error: "Insufficient permissions" },
            { status: 403 }
          );
        }
      }

      // Attach session to request context
      (req as any).session = session;
      
      return handler(req, context);
    } catch (error) {
      return NextResponse.json(
        { error: "Authorization failed" },
        { status: 500 }
      );
    }
  };
}

/**
 * Admin-only middleware
 */
export const withAdmin = (handler: (req: NextRequest, context?: any) => Promise<NextResponse>) =>
  withRole(handler, { requiredRoles: ["NDIA_ADMIN"] });

/**
 * Provider or Admin middleware
 */
export const withProviderOrAdmin = (handler: (req: NextRequest, context?: any) => Promise<NextResponse>) =>
  withRole(handler, { requiredRoles: ["PROVIDER", "NDIA_ADMIN"] });
