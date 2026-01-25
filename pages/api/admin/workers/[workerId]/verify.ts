/**
 * Admin Verify Worker Endpoint
 * Allows admins to verify worker credentials
 */

import { NextApiRequest, NextApiResponse } from "next";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session/config";
import { WorkerVerificationStore } from "@/lib/services/workers/verification-store";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const verifySchema = z.object({
  status: z.enum(["approved", "rejected"]),
  notes: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Check authentication
    const session = await getIronSession<SessionData>(req, res, sessionOptions);
    
    if (!session.isLoggedIn || !session.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Check admin role
    if (session.role !== "NDIA_ADMIN") {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Validate request body
    const body = verifySchema.parse(req.body);
    const { workerId } = req.query;

    if (!workerId || typeof workerId !== "string") {
      return res.status(400).json({ error: "Worker ID required" });
    }

    // Check if worker exists
    const worker = await prisma.worker.findUnique({
      where: { id: workerId },
      include: { user: true },
    });

    if (!worker) {
      return res.status(404).json({ error: "Worker not found" });
    }

    // Create or update verification
    WorkerVerificationStore.setVerification({
      workerId,
      verifiedBy: session.userId,
      verifiedAt: new Date(),
      status: body.status,
      notes: body.notes,
    });

    // Update worker status in database
    await prisma.worker.update({
      where: { id: workerId },
      data: {
        status: body.status === "approved" ? "VERIFIED" : "REJECTED",
      },
    });

    return res.json({
      success: true,
      verification: WorkerVerificationStore.getVerification(workerId),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request", details: error.errors });
    }
    
    return res.status(500).json({ error: "Failed to verify worker" });
  }
}
