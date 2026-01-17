import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { AuditLogger } from "@/lib/services/audit/audit-logger";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireAdmin } from "@/lib/security/authorization-utils";

export async function GET(req: Request) {
  try {
    // SECURITY: Require admin role to export audit logs
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : new Date();
    const format = (searchParams.get("format") as "json" | "csv" | "pdf") || "csv";

    const auditLogger = new AuditLogger();
    const exportData = await auditLogger.exportAuditLogs(
      startDate,
      endDate,
      format
    );

    if (format === "csv") {
      return new NextResponse(exportData, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    } else if (format === "json") {
      return new NextResponse(exportData, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().split("T")[0]}.json"`,
        },
      });
    }

    return NextResponse.json({ exportData });
  } catch (error) {
    console.error("Error exporting audit logs:", error);

    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to export audit logs" },
      { status: 500 }
    );
  }
}
