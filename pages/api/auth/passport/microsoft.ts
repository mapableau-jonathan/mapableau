/**
 * Microsoft OAuth Login Endpoint
 * Initiates Microsoft OAuth flow via Passport
 */

import { NextApiRequest, NextApiResponse } from "next";
import passport from "@/lib/auth/passport-config";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return new Promise<void>((resolve) => {
    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return resolve();
    }

    // Store redirect URL in session
    const redirectUrl = (req.query.callback as string) || "/dashboard";
    
    passport.authenticate("azure-ad", {
      scope: "openid profile email",
      state: redirectUrl,
    })(req, res, () => {
      resolve();
    });
  });
}
