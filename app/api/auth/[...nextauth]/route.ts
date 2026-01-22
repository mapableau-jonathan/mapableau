// app/api/auth/[...nextauth]/route.ts
import { verify } from "argon2";
import NextAuth, { type AuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { prisma } from "@/lib/prisma";

export const authOptions: AuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        console.log("Authorizing user");
        console.log("Credentials:", credentials);
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        console.log("Finding user");
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        console.log("User:", user);
        if (!user) return null;

        const valid = await verify(user.passwordHash, credentials.password);
        console.log("Valid:", valid);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
