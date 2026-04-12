import type { DayOfWeek } from "@prisma/client";

export type Provider = {
  id: string;
  name: string;
  address: {
    id: string;
    addressString: string;
    street: string | null;
    suburb: string | null;
    city: string | null;
    state: string | null;
    postcode: string | null;
    country: string | null;
  };
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
  specialisations: { id: string; name: string }[];
  services: {
    id: string;
    name: string;
    description: string | null;
  }[];
  locations: {
    id: string;
    address: {
      street: string;
      suburb: string | null;
      city: string | null;
      state: string | null;
      postcode: string | null;
      country: string | null;
    } | null;
  }[];
  businessHours: {
    id: string;
    dayOfWeek: DayOfWeek;
    openTime: Date;
    closeTime: Date;
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
