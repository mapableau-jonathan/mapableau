/**
 * Get Pending Worker Verifications
 * Returns list of workers awaiting verification
 */

import { NextApiRequest, NextApiResponse } from "next";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session/config";
import { prisma } from "@/lib/prisma";
import { WorkerVerificationStore } from "@/lib/services/workers/verification-store";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
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

    // Get workers pending verification
    const pendingWorkers = await prisma.worker.findMany({
      where: {
        status: {
          in: ["PENDING_ONBOARDING", "ONBOARDING_IN_PROGRESS"],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        verifications: {
          where: {
            status: {
              in: ["PENDING", "IN_PROGRESS"],
            },
          },
          select: {
            id: true,
            verificationType: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Merge with in-memory verification store
    const workersWithVerifications = pendingWorkers.map((worker) => {
      const verification = WorkerVerificationStore.getVerification(worker.id);
      return {
        ...worker,
        adminVerification: verification,
      };
    });

    return res.json({
      workers: workersWithVerifications,
      count: workersWithVerifications.length,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch pending workers" });
  }
}
