/**
 * Authorization utilities
 * Role-based access control and permission checking
 * Optimized to minimize database queries by using session data and request-scoped caching
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
 * Request-scoped cache for user data to avoid duplicate DB queries
 * Uses WeakMap to automatically clean up when request completes
 */
const userCache = new WeakMap<Request, { user: UserData | null; timestamp: number }>();

interface UserData {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
}

const CACHE_TTL = 1000; // 1 second - short TTL to balance performance and freshness

/**
 * Get current user session with role
 * Optimized to use session role when available, falling back to DB only if needed
 */
export async function getCurrentUser(request?: Request): Promise<UserData | null> {
  // Check request-scoped cache first
  if (request) {
    const cached = userCache.get(request);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.user;
    }
  }

  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    if (request) {
      userCache.set(request, { user: null, timestamp: Date.now() });
    }
    return null;
  }

  // OPTIMIZATION: Use role from session if available (avoids DB query)
  // Session role is set in NextAuth callbacks and updated on sign-in
  if (session.user.role) {
    const user: UserData = {
      id: session.user.id,
      email: session.user.email || "",
      name: session.user.name || null,
      role: session.user.role,
    };
    
    if (request) {
      userCache.set(request, { user, timestamp: Date.now() });
    }
    return user;
  }

  // Fallback: Fetch from database if role not in session (backward compatibility)
  // This should rarely happen after initial deployment
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  if (request) {
    userCache.set(request, { user, timestamp: Date.now() });
  }

  return user;
}

/**
 * Require authenticated user
 * Optimized to accept optional request for caching
 */
export async function requireAuth(request?: Request): Promise<UserData> {
  const user = await getCurrentUser(request);
  
  if (!user) {
    throw new Error("Unauthorized: Authentication required");
  }

  return user;
}

/**
 * Require specific role(s)
 * Optimized to reuse user from requireAuth to avoid duplicate lookups
 */
export async function requireRole(
  allowedRoles: UserRole[],
  request?: Request
): Promise<UserData> {
  const user = await requireAuth(request);

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
export async function requireAdmin(request?: Request): Promise<UserData> {
  return await requireRole([UserRole.NDIA_ADMIN], request);
}

/**
 * Require provider role
 */
export async function requireProvider(request?: Request): Promise<UserData> {
  return await requireRole([UserRole.PROVIDER, UserRole.NDIA_ADMIN], request);
}

/**
 * Require plan manager role
 */
export async function requirePlanManager(request?: Request): Promise<UserData> {
  return await requireRole(
    [UserRole.PLAN_MANAGER, UserRole.NDIA_ADMIN],
    request
  );
}

/**
 * Check if user has one of the required roles
 * Optimized version that doesn't throw, useful for conditional checks
 */
export async function hasRole(
  allowedRoles: UserRole[],
  request?: Request
): Promise<boolean> {
  try {
    const user = await getCurrentUser(request);
    if (!user) return false;
    return allowedRoles.includes(user.role as UserRole);
  } catch {
    return false;
  }
}

/**
 * Check if user is admin (optimized, non-throwing)
 */
export async function isAdmin(request?: Request): Promise<boolean> {
  return hasRole([UserRole.NDIA_ADMIN], request);
}

/**
 * Check if user is plan manager (optimized, non-throwing)
 */
export async function isPlanManager(request?: Request): Promise<boolean> {
  return hasRole([UserRole.PLAN_MANAGER, UserRole.NDIA_ADMIN], request);
}

/**
 * Check if user has admin OR plan manager role
 * Optimized to avoid multiple requireAuth calls
 */
export async function hasAdminOrPlanManagerAccess(
  request?: Request
): Promise<{ hasAccess: boolean; user: UserData | null }> {
  const user = await getCurrentUser(request);
  if (!user) {
    return { hasAccess: false, user: null };
  }

  const userRole = user.role as UserRole;
  const hasAccess =
    userRole === UserRole.NDIA_ADMIN || userRole === UserRole.PLAN_MANAGER;

  return { hasAccess, user };
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

/**
 * Batch user lookup - fetch multiple users in a single query
 * Optimized for admin dashboards, reports, and bulk operations
 */
export async function getUsersBatch(
  userIds: string[]
): Promise<Map<string, UserData | null>> {
  if (userIds.length === 0) {
    return new Map();
  }

  // Remove duplicates
  const uniqueIds = [...new Set(userIds)];

  const users = await prisma.user.findMany({
    where: {
      id: { in: uniqueIds },
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  // Create a map for O(1) lookup
  const userMap = new Map<string, UserData | null>();
  
  // Initialize all requested IDs with null
  uniqueIds.forEach((id) => userMap.set(id, null));
  
  // Set found users
  users.forEach((user) => {
    userMap.set(user.id, {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  });

  return userMap;
}

/**
 * Get user by ID (optimized batch-aware version)
 * Can be used with getUsersBatch for efficient bulk operations
 */
export async function getUserById(userId: string): Promise<UserData | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  return user;
}
