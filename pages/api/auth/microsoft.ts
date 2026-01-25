/**
 * Microsoft OAuth Initiation
 * Redirects to Microsoft OAuth consent screen
 */

import { NextApiRequest, NextApiResponse } from "next";
import { createHandler, withSession } from "@/lib/api";
import passport from "passport";

const handler = createHandler();

handler.get((req: NextApiRequest, res: NextApiResponse) => {
  // Redirect to Microsoft OAuth with account selection prompt
  const authOptions: any = {
    scope: "openid profile email",
  };
  
  // Add prompt=select_account if tenant supports it (common/organizations support it)
  const tenantId = process.env.MICROSOFT_TENANT_ID || "common";
  if (tenantId === "common" || tenantId === "organizations") {
    authOptions.prompt = "select_account";
  }
  
  passport.authenticate("microsoft", authOptions)(req, res);
});

export default withSession(handler);
