/**
 * Worker Ping Endpoint
 * Protected route for worker role
 */

import { NextApiRequest, NextApiResponse } from "next";
import { createHandler, withSession } from "@/lib/api";
import { requireRole } from "@/lib/auth/middleware";
import { IronSessionData } from "iron-session";

const handler = createHandler();

handler.get(
  requireRole("worker") as any,
  (req: NextApiRequest & { session: IronSessionData }, res: NextApiResponse) => {
    res.json({ ok: true, area: "worker" });
  }
);

export default withSession(handler);
