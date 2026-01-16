import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/authorization-utils";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  try {
    // SECURITY: Require admin role to generate reports
    await requireAdmin();

    const workers = await prisma.worker.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        verifications: true,
      },
    });

    // Generate CSV
    const csvRows = [
      [
        "Worker Name",
        "Email",
        "Status",
        "Verification Type",
        "Verification Status",
        "Provider",
        "Verified At",
        "Expires At",
        "Error Message",
      ].join(","),
    ];

    for (const worker of workers) {
      if (worker.verifications.length === 0) {
        csvRows.push(
          [
            worker.user.name || "",
            worker.user.email,
            worker.status,
            "",
            "",
            "",
            "",
            "",
            "",
          ].join(",")
        );
      } else {
        for (const verification of worker.verifications) {
          csvRows.push(
            [
              worker.user.name || "",
              worker.user.email,
              worker.status,
              verification.verificationType,
              verification.status,
              verification.provider,
              verification.verifiedAt?.toISOString() || "",
              verification.expiresAt?.toISOString() || "",
              verification.errorMessage || "",
            ].join(",")
          );
        }
      }
    }

    const csv = csvRows.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="verifications-${new Date().toISOString()}.csv"`,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }
    logger.error("Error generating report", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
