import { auth } from "@/lib/auth";
import { lookupAbn } from "@/lib/abr";
import { prisma } from "@/lib/prisma";
import { parseBody, onboardingPatchSchema } from "@/lib/validation";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const providers = await prisma.claimedProvider.findMany({
    where: {
      userId: session.user.id,
      onboardingStatus: { in: ["not_started", "in_progress"] },
    },
    orderBy: { createdAt: "desc" },
  });

  const current = providers[0] ?? null;
  if (!current) {
    return Response.json({ onboarding: null });
  }

  return Response.json({
    onboarding: {
      claimedProviderId: current.id,
      slug: current.slug,
      step: current.onboardingStatus === "completed" ? "done" : "in_progress",
      name: current.name,
      abn: current.abn,
      phone: current.phone,
      email: current.email,
      website: current.website,
      description: current.description,
      openingHours: current.openingHours,
      suburb: current.suburb,
      state: current.state,
      postcode: current.postcode,
      categories: current.categories,
    },
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [body, err] = await parseBody(request, onboardingPatchSchema);
  if (err) return err;

  const providers = await prisma.claimedProvider.findMany({
    where: {
      userId: session.user.id,
      onboardingStatus: { in: ["not_started", "in_progress"] },
    },
    orderBy: { createdAt: "desc" },
  });

  const current = providers[0];
  if (!current) {
    return Response.json({ error: "No onboarding in progress" }, { status: 404 });
  }

  const {
    complete,
    name,
    abn,
    phone,
    email,
    website,
    description,
    openingHours,
    suburb,
    state,
    postcode,
    categories,
    abnVerified,
  } = body;

  let abnVerifiedAt: Date | null | undefined;
  if (abnVerified === true && abn !== undefined && abn !== null && abn.trim()) {
    const guid = process.env.ABR_GUID ?? "";
    const lookup = await lookupAbn(abn.trim(), guid);
    if (lookup.success) {
      abnVerifiedAt = new Date();
    }
  }

  const updated = await prisma.claimedProvider.update({
    where: { id: current.id },
    data: {
      ...(name !== undefined && { name }),
      ...(abn !== undefined && { abn: abn || null }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email }),
      ...(website !== undefined && { website }),
      ...(description !== undefined && { description }),
      ...(openingHours !== undefined && { openingHours }),
      ...(suburb !== undefined && { suburb }),
      ...(state !== undefined && { state }),
      ...(postcode !== undefined && { postcode }),
      ...(categories !== undefined && { categories }),
      ...(complete === true && { onboardingStatus: "completed" }),
      ...(abnVerifiedAt !== undefined && { abnVerifiedAt }),
    },
  });

  return Response.json({
    claimedProviderId: updated.id,
    slug: updated.slug,
    onboardingStatus: updated.onboardingStatus,
  });
}
