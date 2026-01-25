/**
 * Facebook OAuth Initiation
 * Redirects to Facebook OAuth consent screen
 */

import { NextApiRequest, NextApiResponse } from "next";
import { createHandler, withSession } from "@/lib/api";
import passport from "passport";

const handler = createHandler();

handler.get((req: NextApiRequest, res: NextApiResponse) => {
  // Redirect to Facebook OAuth
  passport.authenticate("facebook", {
    scope: ["email"],
  })(req, res);
});

export default withSession(handler);
