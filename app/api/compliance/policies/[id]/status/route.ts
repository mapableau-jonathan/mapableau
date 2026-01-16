import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PolicyService } from "@/lib/services/compliance/policy-service";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const service = new PolicyService();
    const status = await service.getAcknowledgmentStatus(params.id);

    if (!status) {
      return NextResponse.json(
        { error: "Policy not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error fetching policy status:", error);
    return NextResponse.json(
      { error: "Failed to fetch policy status" },
      { status: 500 }
    );
  }
}
