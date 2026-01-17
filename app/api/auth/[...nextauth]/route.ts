// app/api/auth/[...nextauth]/route.ts
import { verify } from "argon2";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import NextAuth, { type AuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Facebook from "next-auth/providers/facebook";
import Google from "next-auth/providers/google";
import AzureAD from "next-auth/providers/azure-ad";

import { prisma } from "@/lib/prisma";
import { validateEmail } from "@/lib/auth-utils";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/security/rate-limit";

/**
 * Streamlined NextAuth configuration
 * Centralized authentication options
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
    Credentials({
      name: "Credentials",
      credentials: {
        email: { type: "email", label: "Email" },
        password: { type: "password", label: "Password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Validate email format
        if (!validateEmail(credentials.email)) {
          return null;
        }

        try {
          // Find user by email (case-insensitive)
          const user = await prisma.user.findUnique({
            where: { email: credentials.email.toLowerCase().trim() },
          });

          if (!user) {
            // Return null to prevent timing attacks
            return null;
          }

          // OAuth users don't have passwords
          if (!user.passwordHash) {
            return null;
          }

          // Verify password
          const valid = await verify(user.passwordHash, credentials.password);
          if (!valid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          logger.error("Authorization error", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Allow OAuth sign-ins
      if (account?.provider !== "credentials") {
        return true;
      }
      // For credentials, the authorize function handles validation
      return true;
    },
    async jwt({ token, user, account, profile }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        
        // Fetch and cache user role to avoid DB queries on every request
        // Only fetch on initial sign-in or if role is missing
        if (!token.role) {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true },
          });
          token.role = dbUser?.role || null;
        }
      }
      
      // Add provider info for OAuth users
      if (account) {
        token.provider = account.provider;
        token.providerAccountId = account.providerAccountId;
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string | undefined;
        // Include role in session to avoid DB queries
        session.user.role = token.role as string | null;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
