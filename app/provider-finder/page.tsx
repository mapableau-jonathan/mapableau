import { prisma } from "@/lib/prisma";

import ProviderFinderClient from "./ProviderFinderClient";

export default async function Page() {
  const serviceNamesData = await prisma.serviceDefinition.findMany();

  return <ProviderFinderClient serviceNamesData={serviceNamesData} />;
}
