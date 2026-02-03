import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const outletKey = url.searchParams.get("outletKey");
  if (!outletKey) {
    return Response.json({ error: "outletKey required" }, { status: 400 });
  }

  const claimed = await prisma.claimedProvider.findUnique({
    where: { outletKey },
    select: { slug: true },
  });

  if (!claimed) {
    return Response.json({ claimed: false });
  }

  return Response.json({ claimed: true, slug: claimed.slug });
}
