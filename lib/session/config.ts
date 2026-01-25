/**
 * Iron Session Configuration
 * Secure session management for Passport OAuth authentication
 */

import { SessionOptions } from "iron-session";
import { getEnv } from "@/lib/config/env";

const env = getEnv();

export interface SessionData {
  userId?: string;
  email?: string;
  name?: string;
  role?: string;
  image?: string;
  provider?: string;
  isLoggedIn: boolean;
  accessToken?: string;
  refreshToken?: string;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_PASSWORD || process.env.SESSION_SECRET || env.NEXTAUTH_SECRET || "your-secret-key-change-this-in-production-min-32-chars",
  cookieName: "mapable.sid",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: "lax",
  },
};

// Default session data
export const defaultSession: SessionData = {
  isLoggedIn: false,
};
