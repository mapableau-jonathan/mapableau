/**
 * Dev-only Session Role Switcher
 * Updates session user roles and verification status for testing
 * Only works when NODE_ENV !== "production"
 */

import { NextApiRequest, NextApiResponse } from "next";
import { createHandler, withSession } from "@/lib/api";
import { IronSessionData } from "iron-session";
import { Role, VerificationStatus } from "@/lib/auth/types";
import { z } from "zod";

const setSessionSchema = z.object({
  roles: z.array(z.enum(["participant", "worker", "provider_admin", "employer_admin", "platform_admin"])),
  verificationStatus: z.enum(["unverified", "pending", "verified", "suspended", "revoked"]).optional(),
});

const handler = createHandler();

handler.post((req: NextApiRequest & { session: IronSessionData }, res: NextApiResponse) => {
  // Only allow in non-production environments
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Forbidden", message: "This endpoint is not available in production" });
  }

  // Check if user session exists
  if (!req.session.user) {
    return res.status(400).json({
      error: "Bad Request",
      message: "No session user found. Please login or seed a session first.",
    });
  }

  try {
    // Validate request body
    const body = setSessionSchema.parse(req.body);

    // Update session user
    req.session.user.roles = body.roles;
    if (body.verificationStatus !== undefined) {
      req.session.user.verificationStatus = body.verificationStatus;
    }

    // Save session
    req.session.save();

    return res.json({
      ok: true,
      user: req.session.user,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid request body",
        details: error.errors,
      });
    }

    console.error("Error updating session:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update session",
    });
  }
});

export default withSession(handler);
