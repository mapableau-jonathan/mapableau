import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const profile = await prisma.participantProfile.findUnique({
    where: { slug },
  });

  if (!profile || profile.visibility !== "public") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const savedProviders =
    profile.savedProviderIds.length > 0
      ? await prisma.claimedProvider.findMany({
          where: { id: { in: profile.savedProviderIds } },
          select: { id: true, slug: true, name: true },
        })
      : [];

  return Response.json({
    id: profile.id,
    slug: profile.slug,
    displayName: profile.displayName,
    visibility: profile.visibility,
    accessibilityNeeds: profile.accessibilityNeeds,
    preferredCategories: profile.preferredCategories,
    suburb: profile.suburb,
    state: profile.state,
    postcode: profile.postcode,
    savedProviders: savedProviders.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
    })),
  });
}
