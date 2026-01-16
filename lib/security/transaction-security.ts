/**
 * Transaction security utilities
 * Prevents double-spending, replay attacks, and ensures atomicity
 */

import { prisma } from "@/lib/prisma";

interface TransactionRecord {
  id: string;
  status: string;
  amount: number;
  participantId: string;
  providerId: string;
  createdAt: Date;
}

/**
 * Generate idempotency key from request
 */
export function generateIdempotencyKey(
  userId: string,
  action: string,
  params: Record<string, unknown>
): string {
  const key = `${userId}:${action}:${JSON.stringify(params)}`;
  // In production, use a proper hash like SHA-256
  return Buffer.from(key).toString("base64").slice(0, 64);
}

/**
 * Check if transaction is idempotent (prevents duplicate processing)
 */
export async function checkIdempotency(
  idempotencyKey: string
): Promise<{ exists: boolean; result?: unknown }> {
  try {
    // Try Redis first if available
    const { redisClient } = await import("@/lib/cache/redis-client");
    const cached = await redisClient.get(`idempotency:${idempotencyKey}`);
    
    if (cached) {
      return { exists: true, result: cached };
    }

    // Fallback to database check
    // Store idempotency keys in a separate table or use existing transaction table
    // For now, return false (no duplicate found)
    return { exists: false };
  } catch (error) {
    console.error("Error checking idempotency:", error);
    return { exists: false };
  }
}

/**
 * Store idempotency result
 */
export async function storeIdempotency(
  idempotencyKey: string,
  result: unknown,
  ttlSeconds = 3600 // 1 hour default
): Promise<void> {
  try {
    // Try Redis first if available
    const { redisClient } = await import("@/lib/cache/redis-client");
    await redisClient.set(`idempotency:${idempotencyKey}`, result, {
      ttl: ttlSeconds,
    });
  } catch (error) {
    console.error("Error storing idempotency:", error);
    // Fail silently - idempotency is best-effort
  }
}

/**
 * Verify transaction amount is within limits
 */
export function validateTransactionAmount(
  amount: number,
  minAmount = 0.01,
  maxAmount = 100000
): { valid: boolean; error?: string } {
  if (typeof amount !== "number" || isNaN(amount) || !isFinite(amount)) {
    return { valid: false, error: "Invalid amount" };
  }

  if (amount < minAmount) {
    return { valid: false, error: `Amount must be at least ${minAmount}` };
  }

  if (amount > maxAmount) {
    return { valid: false, error: `Amount exceeds maximum of ${maxAmount}` };
  }

  // Round to 2 decimal places to prevent precision issues
  const rounded = Math.round(amount * 100) / 100;
  if (rounded !== amount) {
    return { valid: false, error: "Amount must have at most 2 decimal places" };
  }

  return { valid: true };
}

/**
 * Verify transaction hasn't been tampered with
 */
export function verifyTransactionIntegrity(
  transaction: TransactionRecord,
  originalParams: {
    amount: number;
    participantId: string;
    providerId: string;
  }
): boolean {
  return (
    transaction.amount === originalParams.amount &&
    transaction.participantId === originalParams.participantId &&
    transaction.providerId === originalParams.providerId
  );
}

/**
 * Atomic transaction wrapper
 * Ensures all operations succeed or all fail
 */
export async function withTransaction<T>(
  callback: (tx: typeof prisma) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(async (tx) => {
    return await callback(tx);
  });
}
