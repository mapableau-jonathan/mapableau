import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { JobMatchingEngine } from "@/lib/services/jobs/matching-engine";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireAuth } from "@/lib/security/authorization-utils";

const matchJobsSchema = z.object({
  applicantId: z.string().min(1),
  skills: z.array(z.string()),
  experience: z.number().optional(),
  location: z
    .object({
      address: z.string(),
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
  accessibilityNeeds: z.array(z.string()).optional(),
  preferredJobTypes: z.array(z.string()).optional(),
  limit: z.number().optional().default(10),
});

export async function POST(req: Request) {
  try {
    // requireAuth() throws an error if user is not authenticated, it never returns null
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/90906fb2-e03f-4462-b777-c144956c4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/jobs/match/route.ts:27',message:'requireAuth called',data:{hypothesis:'A'},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const user = await requireAuth();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/90906fb2-e03f-4462-b777-c144956c4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/jobs/match/route.ts:29',message:'requireAuth succeeded',data:{userId:user?.id,hypothesis:'A'},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    const body = await req.json();
    const data = matchJobsSchema.parse(body);

    const matchingEngine = new JobMatchingEngine();
    const matches = await matchingEngine.findMatchingJobs(
      {
        applicantId: data.applicantId,
        skills: data.skills,
        experience: data.experience || 0,
        location: data.location,
        accessibilityNeeds: data.accessibilityNeeds,
        preferredJobTypes: data.preferredJobTypes,
      },
      data.limit
    );

    return NextResponse.json({ matches });
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/90906fb2-e03f-4462-b777-c144956c4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/jobs/match/route.ts:47',message:'catch block entered',data:{errorType:error?.constructor?.name,errorMessage:error instanceof Error?error.message:String(error),isErrorInstance:error instanceof Error,hasUnauthorized:error instanceof Error?error.message.includes("Unauthorized"):false,hypothesis:'A'},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // Handle authentication errors properly - return 401 instead of 500
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/90906fb2-e03f-4462-b777-c144956c4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/jobs/match/route.ts:50',message:'returning 401',data:{hypothesis:'A'},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'A'})}).catch(()=>{});
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
    fetch('http://127.0.0.1:7242/ingest/90906fb2-e03f-4462-b777-c144956c4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/jobs/match/route.ts:64',message:'returning 500',data:{hypothesis:'A'},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    console.error("Error matching jobs:", error);
    return NextResponse.json(
      { error: "Failed to match jobs" },
      { status: 500 }
    );
  }
}
