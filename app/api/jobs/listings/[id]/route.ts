import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { JobService } from "@/lib/services/jobs/job-service";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireAuth } from "@/lib/security/authorization-utils";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const service = new JobService();
    const job = await service.getJobListing(params.id);

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error("Error fetching job listing:", error);
    return NextResponse.json(
      { error: "Failed to fetch job listing" },
      { status: 500 }
    );
  }
}
