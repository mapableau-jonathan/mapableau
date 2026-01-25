/**
 * Session Configuration and Types
 * Iron-session configuration for MapAble authentication
 */

import { SessionOptions } from "iron-session";
import { SessionUser as AuthSessionUser } from "./auth/types";

/**
 * Re-export SessionUser from auth/types for backwards compatibility
 */
export type Provider = "google" | "microsoft" | "facebook" | "dev";
export type SessionUser = AuthSessionUser;

/**
 * Extend IronSessionData to type req.session.user
 */
declare module "iron-session" {
  interface IronSessionData {
    user?: SessionUser;
  }
}

/**
 * Extend IronSessionData to type req.session.user
 */
declare module "iron-session" {
  interface IronSessionData {
    user?: SessionUser;
  }
}

/**
 * Iron-session configuration
 */
export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_PASSWORD || process.env.SESSION_SECRET || "change-this-in-production-min-32-chars-long-secret",
  cookieName: "mapable.sid",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: "lax",
  },
};
