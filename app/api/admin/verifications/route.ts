import { prisma } from "@/lib/prisma";
import { requireAdmin, UserRole } from "@/lib/security/authorization-utils";
import { createGetHandler } from "@/lib/api/route-handler";
import { successResponse } from "@/lib/utils/response";
import { userWithWorker } from "@/lib/utils/db-optimization";

/**
 * GET - Admin verifications list
 * Elegant route using route handler utilities
 */
export const GET = createGetHandler(
  async () => {
    const workers = await prisma.worker.findMany({
      include: userWithWorker,
      orderBy: { createdAt: "desc" },
    });

    const formattedWorkers = workers.map((worker) => ({
      workerId: worker.id,
      workerName: worker.user.name || "Unknown",
      workerEmail: worker.user.email,
      workerStatus: worker.status,
      verifications: worker.verifications.map((v) => ({
        id: v.id,
        type: v.verificationType,
        status: v.status,
        provider: v.provider,
        expiresAt: v.expiresAt,
        verifiedAt: v.verifiedAt,
        errorMessage: v.errorMessage,
      })),
    }));

    return successResponse(formattedWorkers, 200, {
      total: formattedWorkers.length,
    });
  },
  {
    requireAuth: true,
    requireRole: [UserRole.NDIA_ADMIN],
  }
);
