/**
 * User Data Manager
 * Centralized secure user data management with access control
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { serviceRegistry, type ServiceId } from "./service-registry";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Encrypt sensitive data
 */
function encryptData(data: string, key: string): string {
  try {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, Buffer.from(key, "hex").slice(0, 32), iv);
    
    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  } catch (error) {
    logger.error("Encryption error", error);
    throw new Error("Failed to encrypt data");
  }
}

/**
 * Decrypt sensitive data
 */
function decryptData(encryptedData: string, key: string): string {
  try {
    const parts = encryptedData.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted data format");
    }
    
    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encrypted = parts[2];
    
    const decipher = createDecipheriv(ALGORITHM, Buffer.from(key, "hex").slice(0, 32), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error) {
    logger.error("Decryption error", error);
    throw new Error("Failed to decrypt data");
  }
}

/**
 * Get encryption key from environment
 */
function getEncryptionKey(): string {
  const key = process.env.DATA_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (!key || key.length < 64) {
    throw new Error("DATA_ENCRYPTION_KEY must be at least 64 characters");
  }
  return key;
}

export interface UserData {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: boolean;
  role: string;
  providers: string[];
  services: string[];
  createdAt: Date;
  updatedAt: Date;
}

class UserDataManager {
  /**
   * Get user data with field-level access control
   */
  async getUserData(
    userId: string,
    requestingService: ServiceId,
    fields?: string[]
  ): Promise<Partial<UserData> | null> {
    try {
      // Validate service
      const serviceConfig = serviceRegistry.getServiceConfig(requestingService);
      if (!serviceConfig || !serviceConfig.enabled) {
        logger.warn("Unauthorized service access attempt", { userId, requestingService });
        return null;
      }

      // Get user from database
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          accounts: true,
        },
      });

      if (!user) {
        return null;
      }

      // Build response with allowed fields
      const allowedFields = fields || this.getAllowedFields(requestingService);
      const userData: Partial<UserData> = {};

      if (allowedFields.includes("id")) userData.id = user.id;
      if (allowedFields.includes("email")) userData.email = user.email;
      if (allowedFields.includes("name")) userData.name = user.name;
      if (allowedFields.includes("image")) userData.image = user.image;
      if (allowedFields.includes("emailVerified")) userData.emailVerified = !!user.emailVerified;
      if (allowedFields.includes("role")) userData.role = user.role;
      if (allowedFields.includes("providers")) {
        userData.providers = user.accounts.map((acc) => acc.provider);
      }
      if (allowedFields.includes("services")) {
        // TODO: Implement service tracking
        userData.services = [];
      }
      if (allowedFields.includes("createdAt")) userData.createdAt = user.createdAt;
      if (allowedFields.includes("updatedAt")) userData.updatedAt = user.updatedAt;

      // Audit log
      await this.auditUserDataAccess(userId, requestingService, "read");

      return userData;
    } catch (error) {
      logger.error("Get user data error", error);
      return null;
    }
  }

  /**
   * Update user data with validation
   */
  async updateUserData(
    userId: string,
    data: Partial<UserData>,
    requestingService: ServiceId
  ): Promise<boolean> {
    try {
      // Validate service
      const serviceConfig = serviceRegistry.getServiceConfig(requestingService);
      if (!serviceConfig || !serviceConfig.enabled) {
        logger.warn("Unauthorized service update attempt", { userId, requestingService });
        return false;
      }

      // Validate and sanitize data
      const updateData: any = {};
      
      // Only allow certain fields to be updated
      const updatableFields = this.getUpdatableFields(requestingService);
      
      if (updatableFields.includes("name") && data.name !== undefined) {
        updateData.name = this.sanitizeString(data.name);
      }
      if (updatableFields.includes("image") && data.image !== undefined) {
        updateData.image = this.sanitizeUrl(data.image);
      }

      if (Object.keys(updateData).length === 0) {
        return false;
      }

      // Update user
      await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      // Audit log
      await this.auditUserDataAccess(userId, requestingService, "update");

      return true;
    } catch (error) {
      logger.error("Update user data error", error);
      return false;
    }
  }

  /**
   * Delete user data (soft delete with audit trail)
   */
  async deleteUserData(userId: string, requestingService: ServiceId): Promise<boolean> {
    try {
      // Validate service
      const serviceConfig = serviceRegistry.getServiceConfig(requestingService);
      if (!serviceConfig || !serviceConfig.enabled) {
        return false;
      }

      // Soft delete - mark as deleted but keep data for audit
      // In a real implementation, you might want to set a deletedAt field
      await this.auditUserDataAccess(userId, requestingService, "delete");

      logger.warn("User data deletion requested", { userId, requestingService });
      return true;
    } catch (error) {
      logger.error("Delete user data error", error);
      return false;
    }
  }

  /**
   * Export user data (GDPR compliance)
   */
  async exportUserData(userId: string): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          accounts: {
            select: {
              provider: true,
              type: true,
              createdAt: true,
            },
          },
        },
      });

      if (!user) {
        return null;
      }

      // Return all user data for export
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified,
        role: user.role,
        accounts: user.accounts,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      logger.error("Export user data error", error);
      return null;
    }
  }

  /**
   * Audit user data access
   */
  async auditUserDataAccess(
    userId: string,
    serviceId: ServiceId,
    action: string
  ): Promise<void> {
    try {
      // Log to audit system
      logger.info("User data access", {
        userId,
        serviceId,
        action,
        timestamp: new Date().toISOString(),
      });

      // In a production system, you might want to store this in an audit table
    } catch (error) {
      logger.error("Audit logging error", error);
    }
  }

  /**
   * Get allowed fields for a service
   */
  private getAllowedFields(serviceId: ServiceId): string[] {
    // Default allowed fields
    const defaultFields = ["id", "email", "name", "image", "emailVerified"];

    // Service-specific field access
    switch (serviceId) {
      case "mediawiki":
        return [...defaultFields, "role", "providers"];
      case "cursor-replit":
        return ["id", "email", "name", "image"];
      default:
        return defaultFields;
    }
  }

  /**
   * Get updatable fields for a service
   */
  private getUpdatableFields(serviceId: ServiceId): string[] {
    // Most services can only update name and image
    return ["name", "image"];
  }

  /**
   * Sanitize string input
   */
  private sanitizeString(input: string | null): string | null {
    if (!input) return null;
    return input.trim().slice(0, 255); // Limit length
  }

  /**
   * Sanitize URL input
   */
  private sanitizeUrl(input: string | null): string | null {
    if (!input) return null;
    try {
      const url = new URL(input);
      return url.toString();
    } catch {
      return null;
    }
  }
}

export const userDataManager = new UserDataManager();
