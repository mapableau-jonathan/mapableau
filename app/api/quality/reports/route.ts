import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { ReportGeneratorService } from "@/lib/services/quality/report-generator";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireAuth } from "@/lib/security/authorization-utils";

const generateReportSchema = z.object({
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  format: z.enum(["json", "pdf", "csv"]).optional().default("json"),
});

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { startDate, endDate, format } =
      generateReportSchema.parse(body);

    const reportService = new ReportGeneratorService();
    const report = await reportService.generateQualityReport(
      startDate,
      endDate
    );

    if (format === "pdf") {
      const pdf = await reportService.exportToPDF(report);
      return NextResponse.json({ report, pdf });
    } else if (format === "csv") {
      const csv = await reportService.exportToCSV(report);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="quality-report-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error("Error generating quality report:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
