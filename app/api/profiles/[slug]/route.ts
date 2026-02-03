import { auth } from "@/app/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const session = await auth();
  const claimed = await prisma.claimedProvider.findUnique({
    where: { slug },
  });

  if (!claimed) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner =
    !!session?.user?.id && claimed.userId === session.user.id;

  return Response.json({
    id: claimed.id,
    slug: claimed.slug,
    name: claimed.name,
    phone: claimed.phone,
    email: claimed.email,
    website: claimed.website,
    description: claimed.description,
    openingHours: claimed.openingHours,
    suburb: claimed.suburb,
    state: claimed.state,
    postcode: claimed.postcode,
    categories: claimed.categories,
    verifiedAt: claimed.verifiedAt,
    isOwner,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const claimed = await prisma.claimedProvider.findUnique({
    where: { slug },
  });

  if (!claimed) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (claimed.userId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    phone?: string;
    email?: string;
    website?: string;
    description?: string;
    openingHours?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updated = await prisma.claimedProvider.update({
    where: { slug },
    data: {
      ...(body.phone !== undefined && { phone: body.phone ?? null }),
      ...(body.email !== undefined && { email: body.email ?? null }),
      ...(body.website !== undefined && { website: body.website ?? null }),
      ...(body.description !== undefined && {
        description: body.description ?? null,
      }),
      ...(body.openingHours !== undefined && {
        openingHours: body.openingHours ?? null,
      }),
    },
  });

  return Response.json({
    id: updated.id,
    slug: updated.slug,
    name: updated.name,
    phone: updated.phone,
    email: updated.email,
    website: updated.website,
    description: updated.description,
    openingHours: updated.openingHours,
    suburb: updated.suburb,
    state: updated.state,
    postcode: updated.postcode,
    categories: updated.categories,
  });
}
