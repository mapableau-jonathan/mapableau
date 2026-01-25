/**
 * Google OAuth Initiation
 * Redirects to Google OAuth consent screen
 */

import { NextApiRequest, NextApiResponse } from "next";
import { createHandler, withSession } from "@/lib/api";
import passport from "passport";

const handler = createHandler();

handler.get((req: NextApiRequest, res: NextApiResponse) => {
  // Redirect to Google OAuth
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })(req, res);
});

export default withSession(handler);
