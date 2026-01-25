/**
 * NextAuth-Passport Bridge
 * Connects Passport.js strategies to NextAuth.js authentication
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { User, Account } from "@prisma/client";

export interface PassportUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string | null;
}

/**
 * Convert Passport user to NextAuth user format
 */
export function passportToNextAuthUser(
  passportUser: PassportUser
): {
  id: string;
  email: string;
  name: string;
  image?: string | null;
} {
  return {
    id: passportUser.id,
    email: passportUser.email,
    name: passportUser.name || passportUser.email,
    image: passportUser.image,
  };
}

/**
 * Find or create user from Passport OAuth profile
 * Returns user and account for NextAuth
 */
export async function findOrCreateUserFromPassport(
  provider: string,
  providerAccountId: string,
  profile: {
    email?: string;
    name?: string;
    image?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  }
): Promise<{ user: User; account: Account }> {
  const email = profile.email?.toLowerCase().trim();
  if (!email) {
    throw new Error("Email is required from OAuth profile");
  }

  // Find existing user by email
  let user = await prisma.user.findUnique({
    where: { email },
    include: { accounts: true },
  });

  // Find or create account
  let account = user?.accounts.find(
    (acc) => acc.provider === provider && acc.providerAccountId === providerAccountId
  );

  if (user && account) {
    // Update account tokens if provided
    if (profile.accessToken || profile.refreshToken) {
      account = await prisma.account.update({
        where: { id: account.id },
        data: {
          access_token: profile.accessToken || account.access_token,
          refresh_token: profile.refreshToken || account.refresh_token,
          expires_at: profile.expiresAt || account.expires_at,
        },
      });
    }
    return { user, account };
  }

  if (user && !account) {
    // User exists but account doesn't - link account
    account = await prisma.account.create({
      data: {
        userId: user.id,
        type: "oauth",
        provider,
        providerAccountId,
        access_token: profile.accessToken,
        refresh_token: profile.refreshToken,
        expires_at: profile.expiresAt ? new Date(profile.expiresAt * 1000) : null,
      },
    });
    return { user, account };
  }

  // Create new user and account
  user = await prisma.user.create({
    data: {
      email,
      name: profile.name || email.split("@")[0],
      image: profile.image,
      emailVerified: new Date(),
      accounts: {
        create: {
          type: "oauth",
          provider,
          providerAccountId,
          access_token: profile.accessToken,
          refresh_token: profile.refreshToken,
          expires_at: profile.expiresAt ? new Date(profile.expiresAt * 1000) : null,
        },
      },
    },
  });

  account = await prisma.account.findFirst({
    where: {
      userId: user.id,
      provider,
      providerAccountId,
    },
  });

  if (!account) {
    throw new Error("Failed to create account");
  }

  return { user, account };
}

/**
 * Authenticate with Passport and return NextAuth-compatible user
 */
export async function authenticateWithPassport(
  strategy: string,
  ...args: unknown[]
): Promise<PassportUser | null> {
  try {
    // This will be called from Passport strategies
    // The actual authentication happens in the strategy callback
    return null;
  } catch (error) {
    logger.error(`Passport authentication error (${strategy})`, error);
    return null;
  }
}
