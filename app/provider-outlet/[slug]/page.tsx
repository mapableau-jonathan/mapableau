import { notFound } from "next/navigation";

import ProviderOutletGallery from "@/components/provider-outlet/ProviderOutletGallery";
import ProviderOutletHero from "@/components/provider-outlet/ProviderOutletHero";
import ProviderOutletLayout from "@/components/provider-outlet/ProviderOutletLayout";
import ProviderOutletLocationMapClient from "@/components/provider-outlet/ProviderOutletLocationMapClient";
import ProviderOutletOverview from "@/components/provider-outlet/ProviderOutletOverview";
import ProviderOutletReviews from "@/components/provider-outlet/ProviderOutletReviews";
import ProviderOutletServices from "@/components/provider-outlet/ProviderOutletServices";
import ProviderOutletSidebar from "@/components/provider-outlet/ProviderOutletSidebar";
import ProviderOutletWorkers from "@/components/provider-outlet/ProviderOutletWorkers";
import { prisma } from "@/lib/prisma";

export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const providerOutlet = await prisma.providerOutlet.findUnique({
    where: { id: slug },
  });
  if (!providerOutlet) {
    return { title: "Provider Outlet not found" };
  }

  // todo: add description, keywords, etc.
  return { title: providerOutlet.name };
}

// export async function generateStaticParams() {
//   const providers = await prisma.providerOutlet.findMany();
//   return providers.map((providerOutlet) => ({ slug: providerOutlet.id }));
// }

export default async function ProviderOutletPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const providerOutletData = await prisma.providerOutlet.findUnique({
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

  if (!providerOutletData) {
    notFound();
  }

  //  todo: better way of mapping these junction tables
  const services = providerOutletData.services.map((service) => ({
    id: service.serviceDefinition.id,
    name: service.serviceDefinition.name,
    description: service.serviceDefinition.description,
  }));

  const specialisations = providerOutletData.specialisations.map(
    (s) => s.specialisationDefinition,
  );

  const workers = providerOutletData.workers.map((w) => ({
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
  const providerOutlet = {
    ...providerOutletData,
    specialisations,
    services,
    workers,
  };

  return (
    <ProviderOutletLayout
      sidebar={<ProviderOutletSidebar providerOutlet={providerOutlet} />}
    >
      <ProviderOutletHero providerOutlet={providerOutlet} />
      <ProviderOutletServices providerOutlet={providerOutlet} />
      <ProviderOutletOverview providerOutlet={providerOutlet} />
      <ProviderOutletWorkers providerOutlet={providerOutlet} />
      <ProviderOutletGallery providerOutlet={providerOutlet} />
      <ProviderOutletLocationMapClient providerOutlet={providerOutlet} />
      <ProviderOutletReviews providerOutlet={providerOutlet} />
    </ProviderOutletLayout>
  );
}
