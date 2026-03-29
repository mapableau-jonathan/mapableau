import { NextResponse } from "next/server";

import { auth } from "@/app/lib/auth";
import { prisma } from "@/lib/prisma";
import { MembershipResponse } from "@/schemas/provider-admin.types";

export async function GET(): Promise<
  NextResponse<MembershipResponse | { error: string }>
> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.providerUserRole.findMany({
    where: { userId: session.user.id },
    include: {
      provider: { select: { id: true, name: true } },
    },
    orderBy: { provider: { name: "asc" } },
  });

  return NextResponse.json({
    memberships: memberships.map((m) => ({
      providerId: m.provider.id,
      providerName: m.provider.name,
      role: m.role,
    })),
  });
}
