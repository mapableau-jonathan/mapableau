/**
 * Account Linker Service
 * Handles linking multiple OAuth providers to the same user account
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { NormalizedProfile } from "./profile-normalizer";

export interface AccountLinkResult {
  success: boolean;
  userId: string;
  isNewAccount: boolean;
  isNewLink: boolean;
  error?: string;
}

/**
 * Link OAuth account to user
 * Creates new user if doesn't exist, or links to existing user by email
 */
export async function linkAccount(
  normalizedProfile: NormalizedProfile,
  requireEmailVerification: boolean = false
): Promise<AccountLinkResult> {
  try {
    // Validate profile
    if (!normalizedProfile.email) {
      return {
        success: false,
        userId: "",
        isNewAccount: false,
        isNewLink: false,
        error: "Email is required for account linking",
      };
    }

    // Check if account already exists for this provider
    const existingAccount = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: normalizedProfile.provider,
          providerAccountId: normalizedProfile.providerAccountId,
        },
      },
      include: { user: true },
    });

    if (existingAccount) {
      // Account already linked, update tokens if needed
      return {
        success: true,
        userId: existingAccount.userId,
        isNewAccount: false,
        isNewLink: false,
      };
    }

    // Find user by email
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedProfile.email.toLowerCase() },
      include: { accounts: true },
    });

    if (existingUser) {
      // Check if email is verified (if required)
      if (requireEmailVerification && !existingUser.emailVerified) {
        return {
          success: false,
          userId: existingUser.id,
          isNewAccount: false,
          isNewLink: false,
          error: "Email verification required before linking account",
        };
      }

      // Check if this provider is already linked
      const providerAccount = existingUser.accounts.find(
        (acc) => acc.provider === normalizedProfile.provider
      );

      if (providerAccount) {
        // Update existing account
        await prisma.account.update({
          where: { id: providerAccount.id },
          data: {
            providerAccountId: normalizedProfile.providerAccountId,
            access_token: normalizedProfile.rawProfile.accessToken,
            refresh_token: normalizedProfile.rawProfile.refreshToken,
          },
        });

        return {
          success: true,
          userId: existingUser.id,
          isNewAccount: false,
          isNewLink: false,
        };
      }

      // Link new provider to existing user
      await prisma.account.create({
        data: {
          userId: existingUser.id,
          type: "oauth",
          provider: normalizedProfile.provider,
          providerAccountId: normalizedProfile.providerAccountId,
          access_token: normalizedProfile.rawProfile.accessToken,
          refresh_token: normalizedProfile.rawProfile.refreshToken,
        },
      });

      // Update user info if provider data is more recent
      await updateUserFromProfile(existingUser.id, normalizedProfile);

      return {
        success: true,
        userId: existingUser.id,
        isNewAccount: false,
        isNewLink: true,
      };
    }

    // Create new user and account
    const newUser = await prisma.user.create({
      data: {
        email: normalizedProfile.email.toLowerCase(),
        name: normalizedProfile.name,
        image: normalizedProfile.image,
        emailVerified: normalizedProfile.emailVerified ? new Date() : null,
        accounts: {
          create: {
            type: "oauth",
            provider: normalizedProfile.provider,
            providerAccountId: normalizedProfile.providerAccountId,
            access_token: normalizedProfile.rawProfile.accessToken,
            refresh_token: normalizedProfile.rawProfile.refreshToken,
          },
        },
      },
    });

    return {
      success: true,
      userId: newUser.id,
      isNewAccount: true,
      isNewLink: true,
    };
  } catch (error) {
    logger.error("Account linking error", error);
    return {
      success: false,
      userId: "",
      isNewAccount: false,
      isNewLink: false,
      error: error instanceof Error ? error.message : "Account linking failed",
    };
  }
}

/**
 * Update user information from provider profile
 */
async function updateUserFromProfile(userId: string, profile: NormalizedProfile): Promise<void> {
  try {
    const updateData: {
      name?: string;
      image?: string;
      emailVerified?: Date;
    } = {};

    // Update name if provider has better data
    if (profile.name) {
      updateData.name = profile.name;
    }

    // Update image if provider has one and user doesn't
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (profile.image && !user?.image) {
      updateData.image = profile.image;
    }

    // Update email verification status
    if (profile.emailVerified && !user?.emailVerified) {
      updateData.emailVerified = new Date();
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });
    }
  } catch (error) {
    logger.error("Error updating user from profile", error);
  }
}

/**
 * Unlink account from user
 */
export async function unlinkAccount(
  userId: string,
  provider: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Prevent unlinking if it's the only account
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { accounts: true },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (user.accounts.length <= 1) {
      return {
        success: false,
        error: "Cannot unlink the only authentication method. Please add another method first.",
      };
    }

    await prisma.account.deleteMany({
      where: {
        userId,
        provider,
      },
    });

    return { success: true };
  } catch (error) {
    logger.error("Account unlinking error", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Account unlinking failed",
    };
  }
}

/**
 * Get linked accounts for user
 */
export async function getLinkedAccounts(userId: string): Promise<
  Array<{
    provider: string;
    providerAccountId: string;
    linkedAt: Date;
  }>
> {
  try {
    const accounts = await prisma.account.findMany({
      where: { userId },
      select: {
        provider: true,
        providerAccountId: true,
        id: true,
      },
    });

    // Note: Prisma doesn't have createdAt by default, you may need to add it to schema
    return accounts.map((acc) => ({
      provider: acc.provider,
      providerAccountId: acc.providerAccountId,
      linkedAt: new Date(), // You'll need to add createdAt to Account model
    }));
  } catch (error) {
    logger.error("Error getting linked accounts", error);
    return [];
  }
}
