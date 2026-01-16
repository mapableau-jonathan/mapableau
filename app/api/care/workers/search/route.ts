import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const searchSchema = z.object({
  query: z.string().optional(),
  role: z.string().optional(),
  location: z.string().optional(),
  verifiedOnly: z.boolean().optional().default(true),
  page: z.number().optional().default(1),
  limit: z.number().optional().default(20),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const params = {
      query: searchParams.get("query") || undefined,
      role: searchParams.get("role") || undefined,
      location: searchParams.get("location") || undefined,
      verifiedOnly: searchParams.get("verifiedOnly") !== "false",
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "20"),
    };

    const validated = searchSchema.parse(params);

    // Build where clause - require verified workers with NDIS verification
    const where: any = {
      status: "VERIFIED", // Only show verified workers
      verifications: {
        some: {
          verificationType: "NDIS",
          status: "VERIFIED",
          OR: [
            { expiresAt: null }, // No expiry
            { expiresAt: { gt: new Date() } }, // Not expired
          ],
        },
      },
    };

    // Filter by role if provided
    if (validated.role) {
      where.role = {
        contains: validated.role,
        mode: "insensitive",
      };
    }

    // Search by name if query provided
    if (validated.query) {
      where.user = {
        OR: [
          {
            name: {
              contains: validated.query,
              mode: "insensitive",
            },
          },
          {
            email: {
              contains: validated.query,
              mode: "insensitive",
            },
          },
        ],
      };
    }

    // Get total count for pagination
    const total = await prisma.worker.count({ where });

    // Fetch workers with verifications
    const workers = await prisma.worker.findMany({
      where,
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
            status: "VERIFIED",
          },
          select: {
            verificationType: true,
            status: true,
            expiresAt: true,
            verifiedAt: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      skip: (validated.page - 1) * validated.limit,
      take: validated.limit,
    });

    // Format response
    const formattedWorkers = workers.map((worker) => {
      const verifications = worker.verifications.reduce(
        (acc, v) => {
          acc[v.verificationType] = {
            status: v.status,
            expiresAt: v.expiresAt,
            verifiedAt: v.verifiedAt,
          };
          return acc;
        },
        {} as Record<string, { status: string; expiresAt: Date | null; verifiedAt: Date | null }>
      );

      return {
        id: worker.id,
        name: worker.user.name,
        email: worker.user.email,
        image: worker.user.image,
        role: worker.role,
        status: worker.status,
        verifications,
        hasIdentity: verifications.IDENTITY?.status === "VERIFIED",
        hasVEVO: verifications.VEVO?.status === "VERIFIED",
        hasWWCC: verifications.WWCC?.status === "VERIFIED",
        hasNDIS: verifications.NDIS?.status === "VERIFIED",
        hasFirstAid: verifications.FIRST_AID?.status === "VERIFIED",
        createdAt: worker.createdAt,
      };
    });

    return NextResponse.json({
      workers: formattedWorkers,
      pagination: {
        page: validated.page,
        limit: validated.limit,
        total,
        totalPages: Math.ceil(total / validated.limit),
      },
    });
  } catch (error) {
    console.error("Error searching workers:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid search parameters", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to search workers" },
      { status: 500 }
    );
  }
}
