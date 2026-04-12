import { notFound } from "next/navigation";

import ProviderLayout from "@/components/provider/ProviderLayout";
import WorkerAvailability from "@/components/worker/WorkerAvailability";
import WorkerHero from "@/components/worker/WorkerHero";
import WorkerLanguages from "@/components/worker/WorkerLanguages";
import WorkerOverview from "@/components/worker/WorkerOverview";
import WorkerProviders from "@/components/worker/WorkerProviders";
import WorkerReviews from "@/components/worker/WorkerReviews";
import WorkerSidebar from "@/components/worker/WorkerSidebar";
import WorkerSpecialisations from "@/components/worker/WorkerSpecialisations";
import { prisma } from "@/lib/prisma";

export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const worker = await prisma.worker.findUnique({
    where: { id: slug },
    include: { user: { select: { name: true } } },
  });
  if (!worker) {
    return { title: "Worker not found" };
  }

  return {
    title: worker.user.name,
  };
}

export async function generateStaticParams() {
  const workers = await prisma.worker.findMany({ select: { id: true } });
  return workers.map((w) => ({ slug: w.id }));
}

export default async function WorkerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const workerData = await prisma.worker.findUnique({
    where: { id: slug },
    include: {
      user: { select: { name: true, email: true } },
      languages: {
        select: {
          languageDefinition: { select: { id: true, name: true } },
        },
      },
      specialisations: {
        select: {
          specialisationDefinition: { select: { id: true, name: true } },
        },
      },
      availability: true,
      providers: {
        include: {
          provider: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!workerData) {
    notFound();
  }

  // todo: better way of mapping these junction tables
  const languages = workerData.languages.map((l) => l.languageDefinition);
  const specialisations = workerData.specialisations.map(
    (s) => s.specialisationDefinition,
  );

  const worker = {
    ...workerData,
    languages,
    specialisations,
  };

  return (
    <ProviderLayout sidebar={<WorkerSidebar worker={worker} />}>
      <WorkerHero worker={worker} />
      <WorkerOverview worker={worker} />
      <WorkerLanguages worker={worker} />
      <WorkerSpecialisations worker={worker} />
      <WorkerAvailability worker={worker} />
      <WorkerProviders worker={worker} />
      <WorkerReviews worker={worker} />
    </ProviderLayout>
  );
}
