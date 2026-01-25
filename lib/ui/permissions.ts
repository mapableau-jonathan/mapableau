/**
 * UI Permission Helpers
 * Client-side permission checking utilities
 */

import { SessionUser, Role } from "@/lib/auth/types";

export type PermissionAction =
  | "view_admin"
  | "accept_booking"
  | "verify_workers"
  | "view_worker_tools";

/**
 * Check if user has required role(s)
 */
export function hasRole(
  user: SessionUser | null | undefined,
  roleOrRoles: Role | Role[],
  mode: "any" | "all" = "any"
): boolean {
  if (!user || !user.roles) {
    return false;
  }

  const requiredRoles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
  const userRoles = user.roles;

  if (mode === "all") {
    // User must have ALL required roles
    return requiredRoles.every((role) => userRoles.includes(role));
  } else {
    // User must have ANY of the required roles
    return requiredRoles.some((role) => userRoles.includes(role));
  }
}

/**
 * Check if user is a verified worker
 */
export function isVerifiedWorker(user: SessionUser | null | undefined): boolean {
  if (!user) {
    return false;
  }

  return (
    user.roles?.includes("worker") === true &&
    user.verificationStatus === "verified"
  );
}

/**
 * Check if user can perform an action
 */
export function can(user: SessionUser | null | undefined, action: PermissionAction): boolean {
  if (!user) {
    return false;
  }

  switch (action) {
    case "view_admin":
      return hasRole(user, "platform_admin");

    case "accept_booking":
      return isVerifiedWorker(user);

    case "verify_workers":
      return hasRole(user, ["platform_admin", "provider_admin"], "any");

    case "view_worker_tools":
      return hasRole(user, "worker");

    default:
      return false;
  }
}
