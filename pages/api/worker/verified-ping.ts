/**
 * Verified Worker Ping Endpoint
 * Protected route for verified workers only
 */

import { NextApiRequest, NextApiResponse } from "next";
import { createHandler, withSession } from "@/lib/api";
import { requireVerifiedWorker } from "@/lib/auth/middleware";
import { IronSessionData } from "iron-session";

const handler = createHandler();

handler.get(
  requireVerifiedWorker as any,
  (req: NextApiRequest & { session: IronSessionData }, res: NextApiResponse) => {
    res.json({ ok: true, area: "verified_worker" });
  }
);

export default withSession(handler);
