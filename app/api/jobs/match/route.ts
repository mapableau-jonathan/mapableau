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
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

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
    console.error("Error matching jobs:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to match jobs" },
      { status: 500 }
    );
  }
}
