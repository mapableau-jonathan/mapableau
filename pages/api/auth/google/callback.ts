/**
 * Google OAuth Callback
 * Handles Google OAuth callback and sets session
 */

import { NextApiRequest, NextApiResponse } from "next";
import { createHandler, withSession } from "@/lib/api";
import { SessionUser } from "@/lib/session";
import { IronSessionData } from "iron-session";
import passport from "passport";

const handler = createHandler();

handler.get((req: NextApiRequest & { session: IronSessionData }, res: NextApiResponse) => {
  passport.authenticate("google", async (err: any, user: SessionUser) => {
    if (err || !user) {
      return res.redirect("/login?error=oauth_failed");
    }

    try {
      // Set session user (minimal payload - no tokens)
      req.session.user = user;
      await req.session.save();

      // Redirect to dashboard
      res.redirect("/dashboard");
    } catch (error) {
      console.error("Session save error:", error);
      res.redirect("/login?error=session_failed");
    }
  })(req, res);
});

export default withSession(handler);
