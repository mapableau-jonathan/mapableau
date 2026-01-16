import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PolicyService } from "@/lib/services/compliance/policy-service";
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

    const body = await req.json();
    const { signature } = body;

    // Get IP and user agent from request headers
    const ipAddress =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    const service = new PolicyService();
    const acknowledgment = await service.acknowledgePolicy(
      params.id,
      session.user.id,
      signature,
      ipAddress || undefined,
      userAgent
    );

    return NextResponse.json({ acknowledgment });
  } catch (error) {
    console.error("Error acknowledging policy:", error);
    return NextResponse.json(
      { error: "Failed to acknowledge policy" },
      { status: 500 }
    );
  }
}
