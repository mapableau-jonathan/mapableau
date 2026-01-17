/**
 * Passport.js Adapter for Next.js
 * Adapts Passport.js strategies to work with Next.js API routes
 */

import { NextRequest } from "next/server";
import passport from "./passport-config";
import { verify } from "argon2";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Authenticate using Local strategy (email/password)
 */
export async function authenticateLocal(
  email: string,
  password: string
): Promise<{ user: any; error: null } | { user: null; error: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return { user: null, error: "Invalid email or password" };
    }

    if (!user.passwordHash) {
      return {
        user: null,
        error: "Account uses OAuth. Please sign in with your provider.",
      };
    }

    const valid = await verify(user.passwordHash, password);
    if (!valid) {
      return { user: null, error: "Invalid email or password" };
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        image: user.image,
      },
      error: null,
    };
  } catch (error) {
    logger.error("Local authentication error", error);
    return { user: null, error: "Authentication failed" };
  }
}

/**
 * Authenticate using JWT strategy
 */
export async function authenticateJWT(token: string): Promise<{
  user: any;
  error: null;
} | {
  user: null;
  error: string;
}> {
  return new Promise((resolve) => {
    // Create a mock request object for Passport
    const mockReq = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as any;

    passport.authenticate("jwt", { session: false }, (err: any, user: any, info: any) => {
      if (err) {
        logger.error("JWT authentication error", err);
        return resolve({ user: null, error: "Authentication failed" });
      }

      if (!user) {
        return resolve({
          user: null,
          error: info?.message || "Invalid token",
        });
      }

      return resolve({ user, error: null });
    })(mockReq, {} as any, () => {});
  });
}

/**
 * Initiate OAuth2 SSO
 */
export function initiateOAuth2(callbackUrl?: string): { url: string } | { error: string } {
  // This would typically redirect to the OAuth provider
  // For Next.js, we return the URL to redirect to
  const authUrl = process.env.OAUTH2_AUTHORIZATION_URL;
  if (!authUrl) {
    return { error: "OAuth2 not configured" };
  }

  const state = callbackUrl
    ? Buffer.from(JSON.stringify({ callbackUrl })).toString("base64")
    : undefined;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.OAUTH2_CLIENT_ID || "",
    redirect_uri: process.env.OAUTH2_CALLBACK_URL || "",
    scope: process.env.OAUTH2_SCOPE || "openid profile email",
    ...(state && { state }),
  });

  return { url: `${authUrl}?${params.toString()}` };
}

/**
 * Handle OAuth2 callback
 */
export async function handleOAuth2Callback(
  code: string,
  state?: string
): Promise<{ user: any; error: null } | { user: null; error: string }> {
  try {
    // Exchange code for token
    const tokenResponse = await fetch(process.env.OAUTH2_TOKEN_URL || "", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.OAUTH2_CALLBACK_URL || "",
        client_id: process.env.OAUTH2_CLIENT_ID || "",
        client_secret: process.env.OAUTH2_CLIENT_SECRET || "",
      }),
    });

    if (!tokenResponse.ok) {
      return { user: null, error: "Failed to exchange code for token" };
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get user info from OAuth provider
    const userInfoResponse = await fetch(process.env.OAUTH2_USERINFO_URL || "", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      return { user: null, error: "Failed to get user info" };
    }

    const profile = await userInfoResponse.json();
    const email = profile.email || profile.emails?.[0]?.value;

    if (!email) {
      return { user: null, error: "No email found in OAuth profile" };
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { accounts: true },
    });

    if (user) {
      // Update or create account link
      const account = user.accounts.find(
        (acc) => acc.provider === "oauth2" && acc.providerAccountId === profile.sub || profile.id
      );

      if (!account) {
        await prisma.account.create({
          data: {
            userId: user.id,
            type: "oauth",
            provider: "oauth2",
            providerAccountId: profile.sub || profile.id,
            access_token: accessToken,
            refresh_token: tokenData.refresh_token,
          },
        });
      }
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          name: profile.name || profile.displayName || "User",
          image: profile.picture || profile.avatar_url,
          emailVerified: new Date(),
          accounts: {
            create: {
              type: "oauth",
              provider: "oauth2",
              providerAccountId: profile.sub || profile.id,
              access_token: accessToken,
              refresh_token: tokenData.refresh_token,
            },
          },
        },
        include: { accounts: true },
      });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        image: user.image,
      },
      error: null,
    };
  } catch (error) {
    logger.error("OAuth2 callback error", error);
    return { user: null, error: "OAuth2 authentication failed" };
  }
}
