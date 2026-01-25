/**
 * Dev-only Session Seeding Endpoint
 * Sets a mock session user for local testing
 * Only works when NODE_ENV !== "production"
 */

import { NextApiRequest, NextApiResponse } from "next";
import { createHandler, withSession } from "@/lib/api";
import { IronSessionData } from "iron-session";
import { SessionUser } from "@/lib/session";

const handler = createHandler();

handler.post((req: NextApiRequest & { session: IronSessionData }, res: NextApiResponse) => {
  // Only allow in non-production environments
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Set mock session user
  const mockUser: SessionUser = {
    id: "dev-user",
    email: "dev@mapable.local",
    name: "Dev User",
    provider: "dev",
    roles: ["participant"],
    verificationStatus: "unverified",
  };

  req.session.user = mockUser;
  req.session.save();

  return res.json({ ok: true, user: mockUser });
});

export default withSession(handler);
