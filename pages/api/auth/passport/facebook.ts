/**
 * Facebook OAuth Login Endpoint
 * Initiates Facebook OAuth flow via Passport
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
    
    passport.authenticate("facebook", {
      scope: ["email", "public_profile"],
      state: redirectUrl,
    })(req, res, () => {
      resolve();
    });
  });
}
