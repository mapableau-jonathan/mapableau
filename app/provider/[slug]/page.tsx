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
import { Provider } from "@/components/provider/types";
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
  const providerData = await prisma.provider.findUnique({
    where: { id: slug },
    include: {
      address: true,
      locations: {
        include: {
          address: true,
        },
      },
      services: {
        include: {
          serviceDefinition: {
            select: { id: true, name: true, description: true },
          },
        },
      },
      businessHours: true,
      workers: {
        include: {
          worker: {
            include: {
              user: { select: { name: true } },
              languages: {
                select: {
                  languageDefinition: { select: { id: true, name: true } },
                },
              },
              specialisations: {
                select: {
                  specialisationDefinition: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
          },
        },
      },
      specialisations: {
        select: {
          specialisationDefinition: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  if (!providerData) {
    notFound();
  }

  //  todo: better way of mapping these junction tables
  const services = providerData.services.map((service) => ({
    id: service.serviceDefinition.id,
    name: service.serviceDefinition.name,
    description: service.serviceDefinition.description,
  }));

  const specialisations = providerData.specialisations.map(
    (s) => s.specialisationDefinition,
  );

  const workers = providerData.workers.map((w) => ({
    id: w.worker.id,
    worker: {
      ...w.worker,
      specialisations: w.worker.specialisations.map(
        (s) => s.specialisationDefinition,
      ),
      languages: w.worker.languages.map((l) => l.languageDefinition),
    },
  }));

  // const t= providerData.address.addressString;
  // const a = providerData.address;

  // todo: fix this error address.street can be null?
  const provider: any = {
    ...providerData,
    specialisations,
    services,
    workers,
  };

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
