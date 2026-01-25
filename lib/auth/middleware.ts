/**
 * Authentication Middleware
 * Role-based access control for API routes (Pages Router)
 */

import { NextApiRequest, NextApiResponse } from "next";
import { IronSessionData } from "iron-session";
import { Role, SessionUser } from "./types";

export type RequireAuthOptions = {
  redirectTo?: string;
};

export type RequireRoleOptions = {
  mode?: "any" | "all";
};

/**
 * Require authentication middleware
 * Returns 401 if no session user exists
 */
export function requireAuth(
  req: NextApiRequest & { session: IronSessionData },
  res: NextApiResponse,
  options?: RequireAuthOptions
): SessionUser | null {
  const user = req.session.user;

  if (!user) {
    if (options?.redirectTo) {
      res.redirect(options.redirectTo);
      return null;
    }

    res.status(401).json({
      error: "Unauthorized",
      message: "Authentication required",
    });
    return null;
  }

  return user;
}

/**
 * Require role middleware
 * Returns 401 if not logged in, 403 if roles insufficient
 */
export function requireRole(
  required: Role | Role[],
  options?: RequireRoleOptions
) {
  return (
    req: NextApiRequest & { session: IronSessionData },
    res: NextApiResponse
  ): SessionUser | null => {
    // First check authentication
    const user = requireAuth(req, res);
    if (!user) {
      return null;
    }

    // Normalize to array
    const requiredRoles = Array.isArray(required) ? required : [required];
    const userRoles = user.roles || [];

    // Check roles based on mode
    const mode = options?.mode || "any";
    let hasRequiredRole = false;

    if (mode === "all") {
      // User must have ALL required roles
      hasRequiredRole = requiredRoles.every((role) => userRoles.includes(role));
    } else {
      // User must have ANY of the required roles
      hasRequiredRole = requiredRoles.some((role) => userRoles.includes(role));
    }

    if (!hasRequiredRole) {
      res.status(403).json({
        error: "Forbidden",
        message: "Insufficient role permissions",
      });
      return null;
    }

    return user;
  };
}

/**
 * Require verified worker middleware
 * User must have "worker" role AND verificationStatus === "verified"
 */
export function requireVerifiedWorker(
  req: NextApiRequest & { session: IronSessionData },
  res: NextApiResponse
): SessionUser | null {
  // First check authentication
  const user = requireAuth(req, res);
  if (!user) {
    return null;
  }

  // Check for worker role
  if (!user.roles || !user.roles.includes("worker")) {
    res.status(403).json({
      error: "Forbidden",
      message: "Worker role required",
    });
    return null;
  }

  // Check verification status
  if (user.verificationStatus !== "verified") {
    res.status(403).json({
      error: "NOT_VERIFIED",
      message: "Worker verification required",
    });
    return null;
  }

  return user;
}
