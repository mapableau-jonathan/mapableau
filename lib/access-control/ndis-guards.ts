/**
 * NDIS Access Control Guards
 * Utilities to check NDIS verification and certification requirements
 */

import { prisma } from "@/lib/prisma";
import type { VerificationStatus, WorkerStatus } from "@prisma/client";

export interface NDISVerificationResult {
  hasNDISVerification: boolean;
  verificationStatus: VerificationStatus | null;
  expiresAt: Date | null;
  isExpired: boolean;
  workerStatus: WorkerStatus | null;
}

export interface ProviderRegistrationResult {
  isRegistered: boolean;
  registrationStatus: string | null;
  expiresAt: Date | null;
  isExpired: boolean;
  serviceCategories: string[];
}

/**
 * Check if a worker has valid NDIS verification
 */
export async function checkWorkerNDISVerification(
  workerId: string
): Promise<NDISVerificationResult> {
  const worker = await prisma.worker.findUnique({
    where: { id: workerId },
    include: {
      verifications: {
        where: {
          verificationType: "NDIS",
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  if (!worker) {
    return {
      hasNDISVerification: false,
      verificationStatus: null,
      expiresAt: null,
      isExpired: true,
      workerStatus: null,
    };
  }

  const ndisVerification = worker.verifications[0];
  const hasVerification = ndisVerification?.status === "VERIFIED";
  const isExpired =
    !hasVerification ||
    ndisVerification.status === "EXPIRED" ||
    (ndisVerification.expiresAt &&
      ndisVerification.expiresAt < new Date());

  return {
    hasNDISVerification: hasVerification && !isExpired,
    verificationStatus: ndisVerification?.status || null,
    expiresAt: ndisVerification?.expiresAt || null,
    isExpired,
    workerStatus: worker.status,
  };
}

/**
 * Check if a worker has valid NDIS verification by userId
 */
export async function checkWorkerNDISVerificationByUserId(
  userId: string
): Promise<NDISVerificationResult> {
  const worker = await prisma.worker.findUnique({
    where: { userId },
    include: {
      verifications: {
        where: {
          verificationType: "NDIS",
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  if (!worker) {
    return {
      hasNDISVerification: false,
      verificationStatus: null,
      expiresAt: null,
      isExpired: true,
      workerStatus: null,
    };
  }

  const ndisVerification = worker.verifications[0];
  const hasVerification = ndisVerification?.status === "VERIFIED";
  const isExpired =
    !hasVerification ||
    ndisVerification.status === "EXPIRED" ||
    (ndisVerification.expiresAt &&
      ndisVerification.expiresAt < new Date());

  return {
    hasNDISVerification: hasVerification && !isExpired,
    verificationStatus: ndisVerification?.status || null,
    expiresAt: ndisVerification?.expiresAt || null,
    isExpired,
    workerStatus: worker.status,
  };
}

/**
 * Check if a provider is registered with NDIS
 */
export async function checkProviderRegistration(
  userId: string
): Promise<ProviderRegistrationResult> {
  const registration = await prisma.providerRegistration.findUnique({
    where: { userId },
  });

  if (!registration) {
    return {
      isRegistered: false,
      registrationStatus: null,
      expiresAt: null,
      isExpired: true,
      serviceCategories: [],
    };
  }

  const isActive = registration.registrationStatus === "ACTIVE";
  const isExpired =
    !isActive ||
    (registration.expiresAt && registration.expiresAt < new Date());

  return {
    isRegistered: isActive && !isExpired,
    registrationStatus: registration.registrationStatus,
    expiresAt: registration.expiresAt || null,
    isExpired,
    serviceCategories: registration.serviceCategories || [],
  };
}

/**
 * Check if a worker has all required verifications for NDIS work
 * This includes: IDENTITY, VEVO, WWCC (if enabled), NDIS, FIRST_AID (if enabled)
 */
export async function checkWorkerFullyVerified(
  workerId: string
): Promise<{
  isFullyVerified: boolean;
  missingVerifications: string[];
  ndisVerified: boolean;
}> {
  const worker = await prisma.worker.findUnique({
    where: { id: workerId },
    include: {
      verifications: true,
    },
  });

  if (!worker || worker.status !== "VERIFIED") {
    return {
      isFullyVerified: false,
      missingVerifications: ["Worker status not verified"],
      ndisVerified: false,
    };
  }

  const requiredTypes = ["IDENTITY", "VEVO", "NDIS"];
  const optionalTypes = ["WWCC", "FIRST_AID"];

  const missingVerifications: string[] = [];
  let ndisVerified = false;

  // Check required verifications
  for (const type of requiredTypes) {
    const verification = worker.verifications.find(
      (v) => v.verificationType === type
    );
    const isVerified =
      verification?.status === "VERIFIED" &&
      (!verification.expiresAt || verification.expiresAt > new Date());

    if (!isVerified) {
      missingVerifications.push(type);
    }

    if (type === "NDIS" && isVerified) {
      ndisVerified = true;
    }
  }

  // Check optional verifications (warn but don't block)
  for (const type of optionalTypes) {
    const verification = worker.verifications.find(
      (v) => v.verificationType === type
    );
    const isVerified =
      verification?.status === "VERIFIED" &&
      (!verification.expiresAt || verification.expiresAt > new Date());

    if (!isVerified) {
      // Add as warning, not blocking
      missingVerifications.push(`${type} (optional)`);
    }
  }

  return {
    isFullyVerified: missingVerifications.length === 0,
    missingVerifications,
    ndisVerified,
  };
}

/**
 * Guard function to ensure worker has NDIS verification
 * Throws error if verification is missing or expired
 */
export async function requireNDISVerification(
  workerId: string,
  errorMessage?: string
): Promise<void> {
  const result = await checkWorkerNDISVerification(workerId);

  if (!result.hasNDISVerification) {
    throw new Error(
      errorMessage ||
        "NDIS Worker Screening verification is required. Please complete your NDIS verification before accessing this feature."
    );
  }
}

/**
 * Guard function to ensure provider is registered
 * Throws error if registration is missing or expired
 */
export async function requireProviderRegistration(
  userId: string,
  errorMessage?: string
): Promise<void> {
  const result = await checkProviderRegistration(userId);

  if (!result.isRegistered) {
    throw new Error(
      errorMessage ||
        "NDIS Provider registration is required. Please complete your provider registration before accessing this feature."
    );
  }
}

/**
 * Check if user can access NDIS-protected features
 * Returns true if user is either:
 * - A verified worker with NDIS verification
 * - A registered provider
 * - An NDIA admin
 */
export async function canAccessNDISFeatures(
  userId: string,
  userRole?: string
): Promise<{
  canAccess: boolean;
  reason?: string;
  type: "worker" | "provider" | "admin" | "none";
}> {
  // NDIA admins can always access
  if (userRole === "NDIA_ADMIN") {
    return { canAccess: true, type: "admin" };
  }

  // Check if user is a verified worker with NDIS
  const worker = await prisma.worker.findUnique({
    where: { userId },
    include: {
      verifications: {
        where: {
          verificationType: "NDIS",
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  if (worker) {
    const ndisVerification = worker.verifications[0];
    const hasNDIS =
      ndisVerification?.status === "VERIFIED" &&
      worker.status === "VERIFIED" &&
      (!ndisVerification.expiresAt ||
        ndisVerification.expiresAt > new Date());

    if (hasNDIS) {
      return { canAccess: true, type: "worker" };
    }

    return {
      canAccess: false,
      reason: "NDIS Worker Screening verification required",
      type: "worker",
    };
  }

  // Check if user is a registered provider
  const registration = await prisma.providerRegistration.findUnique({
    where: { userId },
  });

  if (registration && registration.registrationStatus === "ACTIVE") {
    const isExpired =
      registration.expiresAt && registration.expiresAt < new Date();
    if (!isExpired) {
      return { canAccess: true, type: "provider" };
    }
  }

  return {
    canAccess: false,
    reason: "NDIS verification or provider registration required",
    type: "none",
  };
}
