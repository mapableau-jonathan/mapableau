import { Prisma } from "@prisma/client";

export const providerOutletFinderInclude = {
  providers: {
    include: {
      services: { include: { serviceDefinition: true } },
      specialisations: { include: { specialisationDefinition: true } },
      businessHours: true,
    },
  },
  providerOutlets: {
    include: {
      provider: true,
      services: { include: { serviceDefinition: true } },
      specialisations: { include: { specialisationDefinition: true } },
      businessHours: true,
    },
  },
} satisfies Prisma.AddressInclude;
