/**
 * Authorization utilities
 * Ensures users can only access their own resources
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

/**
 * Verify user owns or has access to a participant
 */
export async function verifyParticipantAccess(
  userId: string,
  participantId: string
): Promise<boolean> {
  try {
    // Check if user is the participant or has access
    const participant = await prisma.user.findFirst({
      where: {
        id: participantId,
        // Add your access control logic here
        // For example: OR { guardianId: userId }
      },
    });

    return participant?.id === userId;
  } catch (error) {
    console.error("Error verifying participant access:", error);
    return false;
  }
}

/**
 * Verify user owns or has access to a provider
 */
export async function verifyProviderAccess(
  userId: string,
  providerId: string
): Promise<boolean> {
  try {
    // Check if user is the provider or has access
    const provider = await prisma.user.findFirst({
      where: {
        id: providerId,
        // Add your access control logic here
      },
    });

    return provider?.id === userId;
  } catch (error) {
    console.error("Error verifying provider access:", error);
    return false;
  }
}

/**
 * Require authenticated session
 */
export async function requireAuth(): Promise<{
  user: { id: string; email: string; name?: string | null };
} | null> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return null;
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email!,
      name: session.user.name,
    },
  };
}

/**
 * Verify transaction ownership
 */
export async function verifyTransactionAccess(
  userId: string,
  transactionId: string
): Promise<boolean> {
  try {
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
      select: {
        participantId: true,
        providerId: true,
      },
    });

    if (!transaction) {
      return false;
    }

    // User can access if they are the participant or provider
    return (
      transaction.participantId === userId ||
      transaction.providerId === userId
    );
  } catch (error) {
    console.error("Error verifying transaction access:", error);
    return false;
  }
}
