import type { DayOfWeek } from "@prisma/client";

// todo: use prisma client types

export type ProviderWithRelations = {
  id: string;
  name: string;
  logoUrl: string | null;
  description: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  abn: string | null;
  businessType: string | null;
  ndisRegistered: boolean;
  ndisNumber: string | null;
  rating: number | null;
  reviewCount: number;
  serviceAreas: string[];
  specialisations: string[];
  services: {
    id: string;
    name: string;
    description: string | null;
  }[];
  locations: {
    id: string;
    address: string;
    city: string | null;
    state: string | null;
    postcode: string | null;
    country: string | null;
  }[];
  businessHours: {
    id: string;
    dayOfWeek: DayOfWeek;
    openTime: string;
    closeTime: string;
  }[];
  workers?: {
    id: string;
    worker: {
      id: string;
      bio: string | null;
      qualifications: string | null;
      user: { name: string | null } | null;
      languages: { id: string; name: string }[];
      specialisations: { id: string; name: string }[];
    };
  }[];
};
