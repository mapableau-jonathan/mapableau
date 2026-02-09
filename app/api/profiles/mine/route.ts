import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const list = await prisma.claimedProvider.findMany({
    where: { userId: session.user.id },
    select: { slug: true, name: true },
  });

  return Response.json({ profiles: list });
}
