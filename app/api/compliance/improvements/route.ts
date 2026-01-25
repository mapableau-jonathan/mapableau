import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { ImprovementService } from "@/lib/services/compliance/improvement-service";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireAuth } from "@/lib/security/authorization-utils";

const createImprovementSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  source: z.string().optional(),
  relatedIncidentId: z.string().optional(),
  relatedComplaintId: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    // requireAuth() throws an error if user is not authenticated, it never returns null
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/90906fb2-e03f-4462-b777-c144956c4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/compliance/improvements/route.ts:21',message:'requireAuth called',data:{hypothesis:'A'},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const user = await requireAuth();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/90906fb2-e03f-4462-b777-c144956c4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/compliance/improvements/route.ts:23',message:'requireAuth succeeded',data:{userId:user?.id,hypothesis:'A'},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const category = searchParams.get("category") || undefined;
    const priority = searchParams.get("priority") || undefined;

    const service = new ImprovementService();
    const improvements = await service.getImprovements({
      status,
      category,
      priority,
    });

    return NextResponse.json({ improvements });
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/90906fb2-e03f-4462-b777-c144956c4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/compliance/improvements/route.ts:42',message:'catch block entered GET',data:{errorType:error?.constructor?.name,errorMessage:error instanceof Error?error.message:String(error),isErrorInstance:error instanceof Error,hasUnauthorized:error instanceof Error?error.message.includes("Unauthorized"):false,hypothesis:'A'},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // Handle authentication errors properly - return 401 instead of 500
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/90906fb2-e03f-4462-b777-c144956c4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/compliance/improvements/route.ts:46',message:'returning 401 GET',data:{hypothesis:'A'},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/90906fb2-e03f-4462-b777-c144956c4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/compliance/improvements/route.ts:53',message:'returning 500 GET',data:{hypothesis:'A'},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    console.error("Error fetching improvements:", error);
    return NextResponse.json(
      { error: "Failed to fetch improvements" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    // requireAuth() throws an error if user is not authenticated, it never returns null
    const user = await requireAuth();

    const body = await req.json();
    const data = createImprovementSchema.parse(body);

    const service = new ImprovementService();
    const improvement = await service.createImprovement({
      ...data,
      identifiedBy: user.id,
    });

    return NextResponse.json(improvement, { status: 201 });
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/90906fb2-e03f-4462-b777-c144956c4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/compliance/improvements/route.ts:76',message:'catch block entered POST',data:{errorType:error?.constructor?.name,errorMessage:error instanceof Error?error.message:String(error),isErrorInstance:error instanceof Error,hasUnauthorized:error instanceof Error?error.message.includes("Unauthorized"):false,hypothesis:'A'},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // Handle authentication errors properly - return 401 instead of 500
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/90906fb2-e03f-4462-b777-c144956c4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/compliance/improvements/route.ts:80',message:'returning 401 POST',data:{hypothesis:'A'},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'A'})}).catch(()=>{});
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
    fetch('http://127.0.0.1:7242/ingest/90906fb2-e03f-4462-b777-c144956c4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/compliance/improvements/route.ts:93',message:'returning 500 POST',data:{hypothesis:'A'},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    console.error("Error creating improvement:", error);
    return NextResponse.json(
      { error: "Failed to create improvement" },
      { status: 500 }
    );
  }
}
