import { compare } from "bcryptjs";
import type { AuthOptions } from "next-auth";
import Auth0 from "next-auth/providers/auth0";
import AzureAD from "next-auth/providers/azure-ad";
import Credentials from "next-auth/providers/credentials";
import Facebook from "next-auth/providers/facebook";
import Google from "next-auth/providers/google";

import { prisma } from "@/lib/prisma";

const AUTH0_ISSUER = process.env.AUTH0_ISSUER ?? "https://ad-id.auth0.com";

const providers: AuthOptions["providers"] = [
  Auth0({
    clientId: process.env.AUTH0_CLIENT_ID ?? "",
    clientSecret: process.env.AUTH0_CLIENT_SECRET ?? "",
    issuer: AUTH0_ISSUER,
    authorization: {
      params: {
        scope: "openid profile email",
      },
    },
  }),
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          authorization: {
            params: {
              scope: "openid profile email",
            },
          },
        }),
      ]
    : []),
  ...(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
    ? [
        Facebook({
          clientId: process.env.FACEBOOK_CLIENT_ID,
          clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        }),
      ]
    : []),
  ...(process.env.AZURE_AD_CLIENT_ID &&
  process.env.AZURE_AD_CLIENT_SECRET &&
  process.env.AZURE_AD_TENANT_ID
    ? [
        AzureAD({
          clientId: process.env.AZURE_AD_CLIENT_ID,
          clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
          tenantId: process.env.AZURE_AD_TENANT_ID,
        }),
      ]
    : []),
  Credentials({
    id: "credentials",
    name: "credentials",
    credentials: {
      email: { type: "email" },
      password: { type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;

      const user = await prisma.user.findUnique({
        where: { email: credentials.email },
      });

      if (!user) return null;

      const valid = await compare(credentials.password, user.passwordHash);
      if (!valid) return null;

      return {
        id: user.id,
        email: user.email ?? null,
        name: user.name ?? null,
        userType: user.userType ?? undefined,
      };
    },
  }),
];

export const authOptions: AuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user, account }) {
      if (user?.id) token.id = user.id;
      if (user && "userType" in user && user.userType)
        token.userType = user.userType as "participant" | "provider";
      // OAuth providers use sub as id; ensure it's on the token
      const oauthProviders = ["auth0", "google", "facebook", "azure-ad"];
      if (
        account &&
        oauthProviders.includes(account.provider) &&
        user &&
        "sub" in user &&
        user.sub
      )
        token.id = user.sub as string;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.userType = token.userType;
      }
      return session;
    },
  },
};
