/**
 * Admin Ping Endpoint
 * Protected route for platform_admin role
 */

import { NextApiRequest, NextApiResponse } from "next";
import { createHandler, withSession } from "@/lib/api";
import { requireRole } from "@/lib/auth/middleware";
import { IronSessionData } from "iron-session";

const handler = createHandler();

handler.get(
  requireRole("platform_admin") as any,
  (req: NextApiRequest & { session: IronSessionData }, res: NextApiResponse) => {
    res.json({ ok: true, area: "admin" });
  }
);

export default withSession(handler);
