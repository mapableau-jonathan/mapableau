import { notFound } from "next/navigation";

import ProviderGallery from "@/components/provider/ProviderGallery";
import ProviderHero from "@/components/provider/ProviderHero";
import ProviderLayout from "@/components/provider/ProviderLayout";
import ProviderLocationMapClient from "@/components/provider/ProviderLocationMapClient";
import ProviderOverview from "@/components/provider/ProviderOverview";
import ProviderReviews from "@/components/provider/ProviderReviews";
import ProviderServices from "@/components/provider/ProviderServices";
import ProviderSidebar from "@/components/provider/ProviderSidebar";
import ProviderWorkers from "@/components/provider/ProviderWorkers";
import { prisma } from "@/lib/prisma";

export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const provider = await prisma.provider.findUnique({
    where: { id: slug },
  });
  if (!provider) {
    return { title: "Provider not found" };
  }

  // todo: add description, keywords, etc.
  return { title: provider.name };
}

export async function generateStaticParams() {
  const providers = await prisma.provider.findMany();
  return providers.map((provider) => ({ slug: provider.id }));
}

export default async function ProviderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const provider = await prisma.provider.findUnique({
    where: { id: slug },
    include: {
      services: true,
      locations: true,
      businessHours: true,
      workers: {
        include: {
          worker: {
            include: {
              user: { select: { name: true } },
              languages: true,
              specialisations: true,
            },
          },
        },
      },
    },
  });

  if (!provider) {
    notFound();
  }

  return (
    <ProviderLayout sidebar={<ProviderSidebar provider={provider} />}>
      <ProviderHero provider={provider} />
      <ProviderServices provider={provider} />
      <ProviderOverview provider={provider} />
      <ProviderWorkers provider={provider} />
      <ProviderGallery provider={provider} />
      <ProviderLocationMapClient provider={provider} />
      <ProviderReviews provider={provider} />
    </ProviderLayout>
  );
}
