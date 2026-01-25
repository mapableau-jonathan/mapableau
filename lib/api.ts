/**
 * API Route Handler Factory
 * Creates next-connect handlers with iron-session
 * Supports Passport integration later
 */

import { NextApiRequest, NextApiResponse } from "next";
import nextConnect from "next-connect";
import { IronSessionData, withIronSessionApiRoute } from "iron-session";
import { sessionOptions } from "./session";
import { initPassport } from "./passport";
import passport from "passport";

// Initialize Passport once (singleton guard in initPassport)
initPassport();

/**
 * Create API route handler with next-connect, Passport, and iron-session
 */
export function createHandler() {
  return nextConnect<NextApiRequest, NextApiResponse>({
    onError: (err, req, res) => {
      console.error("API route error:", err);
      res.status(500).json({ error: "Internal Server Error" });
    },
    onNoMatch: (req, res) => {
      res.status(405).json({ error: "Method not allowed" });
    },
  })
    .use(passport.initialize())
    .use(passport.session());
}

/**
 * Wrap handler with iron-session
 */
export function withSession(
  handler: (req: NextApiRequest & { session: IronSessionData }, res: NextApiResponse) => Promise<void> | void
) {
  return withIronSessionApiRoute(handler, sessionOptions);
}

/**
 * Authenticated middleware - check if user is in session
 */
export function requireAuth(
  req: NextApiRequest & { session: IronSessionData },
  res: NextApiResponse
) {
  if (!req.session.user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return req.session.user;
}
