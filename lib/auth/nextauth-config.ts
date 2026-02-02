/**
 * NextAuth Configuration
 * Extracted to separate file to avoid Edge runtime issues with native modules
 * This file can be imported by middleware without pulling in argon2
 */

import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { AuthOptions } from "next-auth";
// Temporarily removed Credentials provider - use /api/auth/passport/login instead
// import Credentials from "next-auth/providers/credentials";
import Facebook from "next-auth/providers/facebook";
import Google from "next-auth/providers/google";
import AzureAD from "next-auth/providers/azure-ad";
import Auth0Provider from "next-auth/providers/auth0";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Streamlined NextAuth configuration
 * Centralized authentication options
 * 
 * TEMPORARY WORKAROUND: Credentials provider removed to avoid Edge runtime issues with argon2.
 * Use /api/auth/passport/login for email/password authentication instead.
 * This allows authOptions to be imported by middleware without pulling in native modules.
 */
export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days (reduced from 30 for better security)
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies: process.env.NODE_ENV === "production",
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      // Removed allowDangerousEmailAccountLinking for security
      // Prevents account takeover attacks
    }),
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID || "",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || "",
      // Removed allowDangerousEmailAccountLinking for security
    }),
    AzureAD({
      clientId: process.env.AZURE_AD_CLIENT_ID || "",
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || "",
      tenantId: process.env.AZURE_AD_TENANT_ID || "common",
      // Removed allowDangerousEmailAccountLinking for security
    }),
    // Auth0 as Organizational Launchpad for Australian Disability Ltd
    ...(process.env.AUTH0_CLIENT_ID && process.env.AUTH0_CLIENT_SECRET && process.env.AUTH0_ISSUER
      ? [
          Auth0Provider({
            clientId: process.env.AUTH0_CLIENT_ID,
            clientSecret: process.env.AUTH0_CLIENT_SECRET,
            issuer: process.env.AUTH0_ISSUER,
            authorization: {
              params: {
                ...(process.env.AUTH0_AUDIENCE && { audience: process.env.AUTH0_AUDIENCE }),
                scope: "openid profile email",
              },
            },
          }),
        ]
      : []),
    // TEMPORARY: Credentials provider removed - use /api/auth/passport/login instead
    // This avoids Edge runtime issues with argon2 native module
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // Allow all OAuth sign-ins (including Auth0)
        // Credentials authentication is handled via /api/auth/passport/login
        if (account?.provider === "auth0") {
          logger.info("Auth0 sign-in attempt", {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          });
        }
        return true;
      } catch (error) {
        logger.error("SignIn callback error", error);
        return false;
      }
    },
    async jwt({ token, user, account, profile }) {
      try {
        // Initial sign in
        if (user) {
          token.id = user.id;
          token.email = user.email;
          token.name = user.name;
          token.picture = user.image;
          
          // Fetch and cache user role to avoid DB queries on every request
          // Only fetch on initial sign-in or if role is missing
          if (!token.role) {
            try {
              const dbUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: { role: true },
              });
              token.role = dbUser?.role || null;
            } catch (dbError) {
              logger.error("Error fetching user role", dbError);
              token.role = null;
            }
          }
        }
        
        // Add provider info for OAuth users
        if (account) {
          token.provider = account.provider;
          token.providerAccountId = account.providerAccountId;
        }
        
        return token;
      } catch (error) {
        logger.error("JWT callback error", error);
        return token;
      }
    },
    async session({ session, token }) {
      try {
        if (token && session.user) {
          session.user.id = token.id as string;
          session.user.email = token.email as string;
          session.user.name = token.name as string;
          session.user.image = token.picture as string | undefined;
          // Include role in session to avoid DB queries
          session.user.role = token.role as string | null;
        }
        return session;
      } catch (error) {
        logger.error("Session callback error", error);
        return session;
      }
    },
  },
};
