import "next-auth";
import type { DefaultSession } from "next-auth";

export type UserType = "participant" | "provider";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      userType?: UserType;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    userType?: "participant" | "provider";
  }
}
