import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { JobService } from "@/lib/services/jobs/job-service";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireAuth } from "@/lib/security/authorization-utils";

export async function GET(req: Request) {
  try {
    // requireAuth() throws an error if user is not authenticated, it never returns null
    const user = await requireAuth();

    const service = new JobService();
    const allJobs = await service.getJobListings({});

    // Calculate analytics
    const analytics = {
      totalJobs: allJobs.length,
      activeJobs: allJobs.filter((j: any) => j.status === "ACTIVE").length,
      byCategory: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      avgApplications: 0, // Would calculate from applications
    };

    allJobs.forEach((job: any) => {
      analytics.byCategory[job.category] =
        (analytics.byCategory[job.category] || 0) + 1;
      analytics.byType[job.jobType] = (analytics.byType[job.jobType] || 0) + 1;
    });

    return NextResponse.json(analytics);
  } catch (error) {
    // Handle authentication errors properly - return 401 instead of 500
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.error("Error fetching job analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
