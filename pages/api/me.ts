/**
 * Get Current User
 * Returns session user if authenticated
 */

import { NextApiRequest, NextApiResponse } from "next";
import { createHandler, withSession } from "@/lib/api";
import { IronSessionData } from "iron-session";

const handler = createHandler();

handler.get((req: NextApiRequest & { session: IronSessionData }, res: NextApiResponse) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return res.json({ user: req.session.user });
});

export default withSession(handler);
