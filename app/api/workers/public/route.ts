/**
 * Public Worker Directory API
 * Returns verified workers without sensitive information
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Only return verified workers
    const workers = await prisma.worker.findMany({
      where: {
        status: "VERIFIED",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            // Never expose email or other sensitive data
          },
        },
        verifications: {
          where: {
            status: "VERIFIED",
          },
          select: {
            verificationType: true,
            status: true,
            verifiedAt: true,
            // Never expose providerResponse, documents, or metadata
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      workers: workers.map((worker) => ({
        id: worker.id,
        user: worker.user,
        role: worker.role,
        status: worker.status,
        verifications: worker.verifications.map((v) => ({
          verificationType: v.verificationType,
          status: v.status,
          verifiedAt: v.verifiedAt,
          // Explicitly exclude sensitive fields
        })),
      })),
      count: workers.length,
    });
  } catch (error) {
    console.error("Error fetching public workers:", error);
    return NextResponse.json(
      { error: "Failed to fetch workers" },
      { status: 500 }
    );
  }
}
