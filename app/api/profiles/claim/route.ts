import { auth } from "@/lib/auth";
import { mapOutletsToProviders } from "@/app/provider-finder/outletToProvider";
import type { ProviderOutlet } from "@/data/provider-outlets.types";
import { getProviderOutlets } from "@/lib/provider-outlets";
import { prisma } from "@/lib/prisma";
import { parseBody, claimProfileSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [body, err] = await parseBody(request, claimProfileSchema);
  if (err) return err;

  const { outletKey } = body;

  const outlets = await getProviderOutlets();
  const providers = mapOutletsToProviders(outlets);
  const provider = providers.find((p) => p.outletKey === outletKey);

  if (!provider) {
    return Response.json(
      { error: "Outlet not found" },
      { status: 404 },
    );
  }

  const existing = await prisma.claimedProvider.findUnique({
    where: { outletKey },
  });
  if (existing) {
    return Response.json(
      { error: "This outlet has already been claimed" },
      { status: 409 },
    );
  }

  const slugConflict = await prisma.claimedProvider.findUnique({
    where: { slug: provider.slug },
  });
  const slug = slugConflict
    ? `${provider.slug}-${Date.now().toString(36)}`
    : provider.slug;

  const claimed = await prisma.claimedProvider.create({
    data: {
      slug,
      outletKey,
      userId: session.user.id,
      name: provider.name,
      phone: provider.phone ?? null,
      email: provider.email ?? null,
      website: provider.website ?? null,
      openingHours: provider.openingHours ?? null,
      suburb: provider.suburb !== "—" ? provider.suburb : null,
      state: provider.state ?? null,
      postcode: provider.postcode ?? null,
      categories: provider.categories,
      verifiedAt: new Date(),
      onboardingStatus: "in_progress",
    },
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { userType: "provider" },
  });

  return Response.json({
    success: true,
    claimedProviderId: claimed.id,
    slug: claimed.slug,
  });
}
