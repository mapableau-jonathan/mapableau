/**
 * Account Linker Service
 * Handles linking multiple OAuth providers to the same user account
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { verify } from "argon2";

export interface AccountLinkRequest {
  userId: string;
  provider: string;
  providerAccountId: string;
  accessToken?: string;
  refreshToken?: string;
  email?: string;
  requirePasswordVerification?: boolean;
  password?: string;
}

class AccountLinker {
  /**
   * Link an OAuth account to an existing user
   */
  async linkAccount(request: AccountLinkRequest): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
        include: { accounts: true },
      });

      if (!user) {
        return { success: false, error: "User not found" };
      }

      // Check if account already exists
      const existingAccount = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: request.provider,
            providerAccountId: request.providerAccountId,
          },
        },
      });

      if (existingAccount && existingAccount.userId !== request.userId) {
        return { success: false, error: "Account already linked to another user" };
      }

      // If email is provided and different from user email, verify ownership
      if (request.email && request.email.toLowerCase() !== user.email.toLowerCase()) {
        // Check if email matches
        if (request.email.toLowerCase() !== user.email.toLowerCase()) {
          return { success: false, error: "Email mismatch" };
        }
      }

      // If password verification is required
      if (request.requirePasswordVerification) {
        if (!request.password || !user.passwordHash) {
          return { success: false, error: "Password verification required" };
        }

        const valid = await verify(user.passwordHash, request.password);
        if (!valid) {
          return { success: false, error: "Invalid password" };
        }
      }

      // Create or update account
      if (existingAccount) {
        await prisma.account.update({
          where: { id: existingAccount.id },
          data: {
            access_token: request.accessToken || existingAccount.access_token,
            refresh_token: request.refreshToken || existingAccount.refresh_token,
            expires_at: request.accessToken ? this.calculateExpiresAt() : existingAccount.expires_at,
          },
        });
      } else {
        await prisma.account.create({
          data: {
            userId: request.userId,
            type: "oauth",
            provider: request.provider,
            providerAccountId: request.providerAccountId,
            access_token: request.accessToken,
            refresh_token: request.refreshToken,
            expires_at: request.accessToken ? this.calculateExpiresAt() : null,
          },
        });
      }

      logger.info("Account linked", {
        userId: request.userId,
        provider: request.provider,
      });

      return { success: true };
    } catch (error) {
      logger.error("Account linking error", error);
      return { success: false, error: "Failed to link account" };
    }
  }

  /**
   * Unlink an account from user
   */
  async unlinkAccount(userId: string, provider: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Prevent unlinking if it's the only account and user has no password
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { accounts: true },
      });

      if (!user) {
        return { success: false, error: "User not found" };
      }

      const oauthAccounts = user.accounts.filter((acc) => acc.type === "oauth");
      if (oauthAccounts.length === 1 && !user.passwordHash) {
        return { success: false, error: "Cannot unlink last authentication method" };
      }

      // Delete account
      await prisma.account.deleteMany({
        where: {
          userId,
          provider,
        },
      });

      logger.info("Account unlinked", { userId, provider });
      return { success: true };
    } catch (error) {
      logger.error("Account unlinking error", error);
      return { success: false, error: "Failed to unlink account" };
    }
  }

  /**
   * Get linked accounts for a user
   */
  async getLinkedAccounts(userId: string): Promise<any[]> {
    try {
      const accounts = await prisma.account.findMany({
        where: { userId },
        select: {
          id: true,
          provider: true,
          type: true,
          createdAt: true,
        },
      });

      return accounts;
    } catch (error) {
      logger.error("Get linked accounts error", error);
      return [];
    }
  }

  /**
   * Handle email conflicts between providers
   */
  async handleEmailConflict(
    email: string,
    provider: string,
    providerAccountId: string
  ): Promise<{ userId: string | null; action: "link" | "create" | "error"; error?: string }> {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: { accounts: true },
      });

      if (!user) {
        return { userId: null, action: "create" };
      }

      // Check if account already linked
      const existingAccount = user.accounts.find(
        (acc) => acc.provider === provider && acc.providerAccountId === providerAccountId
      );

      if (existingAccount) {
        return { userId: user.id, action: "link" };
      }

      // Check if user has password (can link safely)
      if (user.passwordHash) {
        return { userId: user.id, action: "link" };
      }

      // User exists but no password - require verification
      return {
        userId: user.id,
        action: "error",
        error: "Email already exists. Please verify ownership to link account.",
      };
    } catch (error) {
      logger.error("Email conflict handling error", error);
      return { userId: null, action: "error", error: "Failed to handle email conflict" };
    }
  }

  /**
   * Calculate token expiration timestamp
   */
  private calculateExpiresAt(): number {
    return Math.floor(Date.now() / 1000) + 3600; // 1 hour
  }
}

export const accountLinker = new AccountLinker();
