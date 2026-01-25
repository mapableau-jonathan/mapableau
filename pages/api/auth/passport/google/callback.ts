/**
 * Google OAuth Callback
 * Handles Google OAuth callback and creates session
 */

import { NextApiRequest, NextApiResponse } from "next";
import passport from "@/lib/auth/passport-config";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session/config";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return new Promise<void>((resolve) => {
    passport.authenticate("google", async (err: any, user: any, info: any) => {
      try {
        if (err || !user) {
          logger.error("Google OAuth error", err || info);
          res.redirect("/login?error=oauth_failed");
          return resolve();
        }

        // Get or create session
        const session = await getIronSession<SessionData>(req, res, sessionOptions);

        // Update session with user data
        session.userId = user.id;
        session.email = user.email;
        session.name = user.name || undefined;
        session.role = user.role || undefined;
        session.image = user.image || undefined;
        session.provider = "google";
        session.isLoggedIn = true;

        await session.save();

        // Get redirect URL from state or default
        const redirectUrl = (req.query.state as string) || "/dashboard";
        res.redirect(redirectUrl);
        resolve();
      } catch (error) {
        logger.error("Google callback error", error);
        res.redirect("/login?error=session_failed");
        resolve();
      }
    })(req, res);
  });
}
