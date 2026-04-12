import { notFound, redirect } from "next/navigation";

import {
  getAdminCatalog,
  getAdminResponse,
  getProviderMembership,
  getProviderWithWorkers,
  getSessionUserId,
  isValidProviderId,
} from "@/app/utils/provider-admin";
import { ProviderAdminDashboard } from "@/components/provider-admin/ProviderAdminDashboard";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ providerId: string }>;
}) {
  const { providerId } = await params;
  if (!isValidProviderId(providerId)) {
    return { title: "Provider admin" };
  }
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { name: true },
  });
  return {
    title: provider ? `Admin · ${provider.name}` : "Provider admin",
  };
}

export default async function ProviderAdminProviderPage({
  params,
}: {
  params: Promise<{ providerId: string }>;
}) {
  const userId = await getSessionUserId();
  console.log("userId", userId);
  if (!userId) {
    const { providerId } = await params;
    redirect(
      `/login?callbackUrl=${encodeURIComponent(`/provider-admin/${providerId}`)}`,
    );
  }

  const { providerId } = await params;
  console.log("providerId", providerId);
  if (!isValidProviderId(providerId)) {
    console.log("invalid providerId");
    notFound();
  }

  const membership = await getProviderMembership(userId, providerId);
  if (!membership) {
    console.log("no membership");
    notFound();
  }

  const provider = await getProviderWithWorkers(providerId);
  if (!provider) {
    console.log("no provider");
    notFound();
  }

  const adminPayload = getAdminResponse(membership, provider);
  const adminCatalog = await getAdminCatalog();

  return (
    <ProviderAdminDashboard
      providerId={providerId}
      adminPayload={adminPayload}
      adminCatalog={adminCatalog}
    />
  );
}
