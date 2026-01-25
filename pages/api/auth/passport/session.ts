/**
 * Session Endpoint
 * Returns current session data
 */

import { NextApiRequest, NextApiResponse } from "next";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions, defaultSession } from "@/lib/session/config";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const session = await getIronSession<SessionData>(req, res, sessionOptions);
    
    if (!session.isLoggedIn) {
      return res.json(defaultSession);
    }

    return res.json({
      ...session,
      // Don't expose tokens in session response
      accessToken: undefined,
      refreshToken: undefined,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to get session" });
  }
}
