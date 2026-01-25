/**
 * Logout
 * Destroys session
 */

import { NextApiRequest, NextApiResponse } from "next";
import { createHandler, withSession } from "@/lib/api";
import { IronSessionData } from "iron-session";

const handler = createHandler();

handler.post((req: NextApiRequest & { session: IronSessionData }, res: NextApiResponse) => {
  req.session.destroy();
  return res.json({ ok: true });
});

export default withSession(handler);
