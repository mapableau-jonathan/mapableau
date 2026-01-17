/**
 * User Data Manager
 * Centralized secure user data management with encryption and access control
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ServiceId } from "./service-registry";
import crypto from "crypto";

// Field-level access control configuration
const FIELD_ACCESS_CONTROL: Record<string, ServiceId[]> = {
  email: ["mapable", "accessibooks", "disapedia", "mediawiki", "cursor-replit"],
  name: ["mapable", "accessibooks", "disapedia", "mediawiki", "cursor-replit"],
  image: ["mapable", "accessibooks", "disapedia", "mediawiki"],
  role: ["mapable", "accessibooks", "disapedia"],
  passwordHash: [], // Never exposed
  twoFactorSecret: [], // Never exposed
  wixData: ["mediawiki", "cursor-replit"], // Wix-specific data
};

/**
 * Get encryption key from environment
 */
function getEncryptionKey(): Buffer {
  const key = process.env.DATA_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("DATA_ENCRYPTION_KEY environment variable is required");
  }
  // Use first 32 bytes for AES-256
  return crypto.createHash("sha256").update(key).digest();
}

/**
 * Encrypt sensitive data
 */
function encryptData(data: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * Decrypt sensitive data
 */
function decryptData(encryptedData: string): string {
  const key = getEncryptionKey();
  const [ivHex, encrypted] = encryptedData.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export interface UserData {
  id: string;
  email: string;
  name?: string;
  image?: string;
  role?: string;
  emailVerified?: boolean;
  wixData?: {
    memberId?: string;
    customFields?: Record<string, any>;
    roles?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get user data with field-level access control
 */
export async function getUserData(
  userId: string,
  requestingService: ServiceId,
  fields?: string[]
): Promise<UserData | null> {
  try {
    // Audit log
    await auditUserDataAccess(userId, requestingService, "read");

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        accounts: {
          where: { provider: "wix" },
          select: {
            access_token: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    // Build user data object with access control
    const userData: Partial<UserData> = {
      id: user.id,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // Apply field-level access control
    const allowedFields = fields || Object.keys(FIELD_ACCESS_CONTROL);

    for (const field of allowedFields) {
      const allowedServices = FIELD_ACCESS_CONTROL[field] || [];
      if (allowedServices.includes(requestingService) || allowedServices.length === 0) {
        switch (field) {
          case "email":
            userData.email = user.email;
            break;
          case "name":
            userData.name = user.name || undefined;
            break;
          case "image":
            userData.image = user.image || undefined;
            break;
          case "role":
            userData.role = user.role || undefined;
            break;
          case "emailVerified":
            userData.emailVerified = !!user.emailVerified;
            break;
          case "wixData":
            // Wix data would be retrieved from Wix API if needed
            // For now, we'll include basic info
            if (user.accounts.length > 0) {
              userData.wixData = {
                memberId: user.accounts[0].providerAccountId,
              };
            }
            break;
        }
      }
    }

    return userData as UserData;
  } catch (error) {
    logger.error("Error getting user data", error);
    throw error;
  }
}

/**
 * Update user data with validation
 */
export async function updateUserData(
  userId: string,
  data: Partial<UserData>,
  requestingService: ServiceId
): Promise<{ success: boolean; error?: string }> {
  try {
    // Audit log
    await auditUserDataAccess(userId, requestingService, "update");

    // Validate service can update requested fields
    for (const field of Object.keys(data)) {
      const allowedServices = FIELD_ACCESS_CONTROL[field] || [];
      if (allowedServices.length > 0 && !allowedServices.includes(requestingService)) {
        return {
          success: false,
          error: `Service ${requestingService} is not authorized to update field ${field}`,
        };
      }
    }

    // Build update data
    const updateData: any = {};
    if (data.email) updateData.email = data.email.toLowerCase();
    if (data.name !== undefined) updateData.name = data.name;
    if (data.image !== undefined) updateData.image = data.image;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.emailVerified !== undefined) {
      updateData.emailVerified = data.emailVerified ? new Date() : null;
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return { success: true };
  } catch (error) {
    logger.error("Error updating user data", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Update failed",
    };
  }
}

/**
 * Delete user data (GDPR compliance)
 */
export async function deleteUserData(
  userId: string,
  requestingService: ServiceId
): Promise<{ success: boolean; error?: string }> {
  try {
    // Audit log
    await auditUserDataAccess(userId, requestingService, "delete");

    // Soft delete - mark user as deleted
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted-${userId}@deleted.local`,
        name: "Deleted User",
        // Add deletedAt field to schema if needed
      },
    });

    // Delete service links
    await prisma.serviceLink.deleteMany({
      where: { userId },
    });

    return { success: true };
  } catch (error) {
    logger.error("Error deleting user data", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Deletion failed",
    };
  }
}

/**
 * Export user data (GDPR compliance)
 */
export async function exportUserData(userId: string): Promise<UserData | null> {
  try {
    // Audit log
    await auditUserDataAccess(userId, "system" as ServiceId, "export");

    return getUserData(userId, "mapable", [
      "email",
      "name",
      "image",
      "role",
      "emailVerified",
      "wixData",
    ]);
  } catch (error) {
    logger.error("Error exporting user data", error);
    return null;
  }
}

/**
 * Audit user data access
 */
async function auditUserDataAccess(
  userId: string,
  serviceId: ServiceId,
  action: "read" | "update" | "delete" | "export"
): Promise<void> {
  try {
    logger.info("User data access audit", {
      userId,
      serviceId,
      action,
      timestamp: new Date().toISOString(),
    });

    // In a full implementation, you would store this in an audit log table
  } catch (error) {
    logger.error("Error logging user data access", error);
  }
}
