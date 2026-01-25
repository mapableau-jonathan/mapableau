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
    // requireAuth() throws an error if user is not authenticated, it never returns null
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/90906fb2-e03f-4462-b777-c144956c4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/quality/reports/route.ts:17',message:'requireAuth called',data:{hypothesis:'A'},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const user = await requireAuth();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/90906fb2-e03f-4462-b777-c144956c4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/quality/reports/route.ts:19',message:'requireAuth succeeded',data:{userId:user?.id,hypothesis:'A'},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/90906fb2-e03f-4462-b777-c144956c4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/quality/reports/route.ts:44',message:'catch block entered',data:{errorType:error?.constructor?.name,errorMessage:error instanceof Error?error.message:String(error),isErrorInstance:error instanceof Error,hasUnauthorized:error instanceof Error?error.message.includes("Unauthorized"):false,hypothesis:'A'},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // Handle authentication errors properly - return 401 instead of 500
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/90906fb2-e03f-4462-b777-c144956c4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/quality/reports/route.ts:47',message:'returning 401',data:{hypothesis:'A'},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/90906fb2-e03f-4462-b777-c144956c4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/quality/reports/route.ts:61',message:'returning 500',data:{hypothesis:'A'},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    console.error("Error generating quality report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
