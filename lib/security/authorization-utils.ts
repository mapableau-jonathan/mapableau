/**
 * Authorization utilities
 * Role-based access control and permission checking
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export enum UserRole {
  PARTICIPANT = "PARTICIPANT",
  PROVIDER = "PROVIDER",
  PLAN_MANAGER = "PLAN_MANAGER",
  NDIA_ADMIN = "NDIA_ADMIN",
  USER = "USER",
}

/**
 * Get current user session with role
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return null;
  }

  // Fetch user with role from database
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  return user;
}

/**
 * Require authenticated user
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("Unauthorized: Authentication required");
  }

  return user;
}

/**
 * Require specific role(s)
 */
export async function requireRole(allowedRoles: UserRole[]) {
  const user = await requireAuth();

  if (!allowedRoles.includes(user.role as UserRole)) {
    throw new Error(
      `Forbidden: Requires one of the following roles: ${allowedRoles.join(", ")}`
    );
  }

  return user;
}

/**
 * Require admin role
 */
export async function requireAdmin() {
  return await requireRole([UserRole.NDIA_ADMIN]);
}

/**
 * Require provider role
 */
export async function requireProvider() {
  return await requireRole([UserRole.PROVIDER, UserRole.NDIA_ADMIN]);
}

/**
 * Require plan manager role
 */
export async function requirePlanManager() {
  return await requireRole([
    UserRole.PLAN_MANAGER,
    UserRole.NDIA_ADMIN,
  ]);
}

/**
 * Check if user has access to resource
 */
export async function hasResourceAccess(
  userId: string,
  resourceId: string,
  resourceType: "participant" | "provider" | "plan" | "transaction"
): Promise<boolean> {
  try {
    switch (resourceType) {
      case "participant":
        return userId === resourceId;

      case "provider":
        return userId === resourceId;

      case "plan":
        const plan = await prisma.nDISPlan.findUnique({
          where: { id: resourceId },
          select: { participantId: true, planManagerId: true },
        });
        return (
          plan?.participantId === userId ||
          plan?.planManagerId === userId ||
          false
        );

      case "transaction":
        const transaction = await prisma.paymentTransaction.findUnique({
          where: { id: resourceId },
          select: { participantId: true, providerId: true },
        });
        return (
          transaction?.participantId === userId ||
          transaction?.providerId === userId ||
          false
        );

      default:
        return false;
    }
  } catch (error) {
    return false;
  }
}

/**
 * Require access to resource
 */
export async function requireResourceAccess(
  userId: string,
  resourceId: string,
  resourceType: "participant" | "provider" | "plan" | "transaction"
) {
  const hasAccess = await hasResourceAccess(userId, resourceId, resourceType);
  
  if (!hasAccess) {
    throw new Error("Forbidden: No access to this resource");
  }
}
