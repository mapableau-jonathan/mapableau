import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { ComplianceReportGenerator } from "@/lib/services/reports/compliance-report-generator";
import { NDISAuditPackGenerator } from "@/lib/services/reports/ndis-audit-pack";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireAdmin } from "@/lib/security/authorization-utils";

const generateReportSchema = z.object({
  reportType: z.enum([
    "incidents",
    "complaints",
    "training",
    "verification",
    "policies",
    "risks",
    "audit-pack",
  ]),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  format: z.enum(["json", "pdf", "csv"]).optional().default("pdf"),
});

export async function POST(req: Request) {
  try {
    // SECURITY: Require admin role to generate compliance reports
    await requireAdmin();

    const body = await req.json();
    const { reportType, startDate, endDate, format } =
      generateReportSchema.parse(body);

    let report;

    if (reportType === "audit-pack") {
      const packGenerator = new NDISAuditPackGenerator();
      const pack = await packGenerator.generateAuditPack();
      report = pack;
    } else {
      const reportGenerator = new ComplianceReportGenerator();
      const complianceReport = await reportGenerator.generateComplianceReport(
        startDate,
        endDate
      );

      // Filter by report type
      switch (reportType) {
        case "incidents":
          report = {
            ...complianceReport,
            sections: {
              incidents: complianceReport.sections.incidents,
            },
          };
          break;
        case "complaints":
          report = {
            ...complianceReport,
            sections: {
              complaints: complianceReport.sections.complaints,
            },
          };
          break;
        case "training":
          report = {
            ...complianceReport,
            sections: {
              training: complianceReport.sections.training,
            },
          };
          break;
        case "verification":
          report = {
            ...complianceReport,
            sections: {
              workerVerification: complianceReport.sections.workerVerification,
            },
          };
          break;
        case "policies":
          report = {
            ...complianceReport,
            sections: {
              policies: complianceReport.sections.policies,
            },
          };
          break;
        case "risks":
          report = {
            ...complianceReport,
            sections: {
              risks: complianceReport.sections.risks,
            },
          };
          break;
        default:
          report = complianceReport;
      }
    }

    // Generate PDF (simplified - in production, use a PDF library)
    if (format === "pdf") {
      // TODO: Convert to PDF using pdfkit or puppeteer
      return NextResponse.json({
        report,
        message: "PDF generation coming soon",
      });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error("Error generating compliance report:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
