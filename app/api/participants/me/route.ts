import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidSlug, slugify, slugProvisioning } from "@/lib/routes";
import { parseBody, participantProfilePatchSchema } from "@/lib/validation";

/** Participant slug suffix so participant URLs don't collide with claimed provider slugs. */
const PARTICIPANT_SLUG_SUFFIX = "-me";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [profile, claimedProfiles] = await Promise.all([
    prisma.participantProfile.findUnique({
      where: { userId: session.user.id },
    }),
    prisma.claimedProvider.findMany({
      where: { userId: session.user.id },
      select: { slug: true },
      take: 1,
    }),
  ]);

  const suggestedSlugFromProfiles =
    claimedProfiles[0]?.slug != null
      ? slugify(claimedProfiles[0].slug + PARTICIPANT_SLUG_SUFFIX)
      : null;

  if (!profile) {
    return Response.json(
      {
        error: "Not found",
        suggestedSlugFromProfiles,
      },
      { status: 404 },
    );
  }

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
    savedProviderIds: profile.savedProviderIds,
    suggestedSlugFromProfiles,
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [body, err] = await parseBody(request, participantProfilePatchSchema);
  if (err) return err;

  let slug: string | null | undefined = body.slug;
  const visibility = body.visibility ?? "private";

  if (visibility === "public") {
    const trimmed =
      slug !== undefined && slug !== null ? String(slug).trim() : "";
    let baseSlug: string;
    if (trimmed !== "") {
      baseSlug = slugify(trimmed);
      if (!isValidSlug(baseSlug)) {
        return Response.json(
          {
            error:
              "Invalid slug; use lowercase letters, numbers, and hyphens only",
          },
          { status: 400 },
        );
      }
    } else {
      const firstClaimed = await prisma.claimedProvider.findFirst({
        where: { userId: session.user.id },
        select: { slug: true },
      });
      baseSlug =
        firstClaimed?.slug != null
          ? slugify(firstClaimed.slug + PARTICIPANT_SLUG_SUFFIX)
          : slugify("profile");
    }
    const exists = async (s: string) => {
      const [byParticipant, byClaimed] = await Promise.all([
        prisma.participantProfile.findUnique({ where: { slug: s } }),
        prisma.claimedProvider.findUnique({ where: { slug: s } }),
      ]);
      if (byParticipant && byParticipant.userId === session.user?.id)
        return false;
      if (byParticipant) return true;
      if (byClaimed) return true;
      return false;
    };
    slug = await slugProvisioning.ensureUnique(baseSlug, exists);
  }

  if (visibility === "private") {
    slug = null;
  }

  const data = {
    ...(body.displayName !== undefined && { displayName: body.displayName }),
    ...(body.visibility !== undefined && { visibility: body.visibility }),
    ...(slug !== undefined && { slug }),
    ...(body.accessibilityNeeds !== undefined && {
      accessibilityNeeds: body.accessibilityNeeds,
    }),
    ...(body.preferredCategories !== undefined && {
      preferredCategories: body.preferredCategories,
    }),
    ...(body.suburb !== undefined && { suburb: body.suburb }),
    ...(body.state !== undefined && { state: body.state }),
    ...(body.postcode !== undefined && { postcode: body.postcode }),
    ...(body.savedProviderIds !== undefined && {
      savedProviderIds: body.savedProviderIds,
    }),
  };

  const profile = await prisma.participantProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      displayName: (data.displayName as string | null) ?? null,
      visibility: (data.visibility as string) ?? "private",
      slug: (data.slug as string | null) ?? null,
      accessibilityNeeds: (data.accessibilityNeeds as string | null) ?? null,
      preferredCategories: (data.preferredCategories as string[]) ?? [],
      suburb: (data.suburb as string | null) ?? null,
      state: (data.state as string | null) ?? null,
      postcode: (data.postcode as string | null) ?? null,
      savedProviderIds: (data.savedProviderIds as string[]) ?? [],
    },
    update: data,
  });

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
    savedProviderIds: profile.savedProviderIds,
  });
}
