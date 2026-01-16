import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ComplaintService } from "@/lib/services/compliance/complaint-service";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(
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

    const service = new ComplaintService();
    const complaint = await service.acknowledgeComplaint(
      params.id,
      session.user.id
    );

    return NextResponse.json(complaint);
  } catch (error) {
    console.error("Error acknowledging complaint:", error);
    return NextResponse.json(
      { error: "Failed to acknowledge complaint" },
      { status: 500 }
    );
  }
}
