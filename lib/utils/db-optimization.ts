/**
 * Database query optimization utilities
 * Provides optimized Prisma query patterns
 */

import { Prisma } from "@prisma/client";

/**
 * Common select patterns for efficiency
 */
export const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export const workerSelect = {
  id: true,
  userId: true,
  status: true,
  onboardingStatus: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.WorkerSelect;

export const transactionSelect = {
  id: true,
  planId: true,
  participantId: true,
  providerId: true,
  amount: true,
  status: true,
  serviceCode: true,
  serviceDescription: true,
  createdAt: true,
  completedAt: true,
} satisfies Prisma.PaymentTransactionSelect;

/**
 * Optimized include patterns
 */
export const userWithWorker = {
  user: {
    select: userSelect,
  },
  verifications: {
    select: {
      id: true,
      verificationType: true,
      status: true,
      provider: true,
      expiresAt: true,
      verifiedAt: true,
    },
  },
} satisfies Prisma.WorkerInclude;

/**
 * Pagination helper
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export function getPagination(params: PaginationParams) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Build where clause with optional filters
 */
export function buildWhereClause<T extends Record<string, unknown>>(
  filters: Partial<T>
): Prisma.PrismaWhereInput {
  const where: Prisma.PrismaWhereInput = {};

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      where[key] = value;
    }
  }

  return where;
}
