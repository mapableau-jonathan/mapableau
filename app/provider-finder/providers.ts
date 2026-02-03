export type ProviderSupportMode = "In-person" | "Telehealth";

export type Provider = {
  id: string;
  slug: string;
  name: string;
  suburb: string;
  state: "NSW" | "VIC" | "QLD" | "SA" | "WA" | "TAS" | "ACT" | "NT";
  postcode: string;
  distanceKm: number;
  rating: number;
  reviewCount: number;
  registered: boolean;
  categories: string[];
  supports: ProviderSupportMode[];
  /** From outlet data; used by Map when present */
  latitude?: number;
  longitude?: number;
  /** From outlet data; shown on card */
  phone?: string;
  email?: string;
  website?: string;
  abn?: string;
  openingHours?: string;
  /** Stable key for claim matching: ABN-slugify(Outletname)-slugify(Address) */
  outletKey?: string;
};

export const PROVIDER_CATEGORIES = [
  "Assistance with Daily Life",
  "Support Coordination",
  "Therapeutic Supports",
  "Assistive Technology",
  "Home Modifications",
  "Community Participation",
  "Transport",
  "Employment Supports",
] as const;

export const PROVIDERS: Provider[] = [
  {
    id: "prov_001",
    slug: "harbour-support-co",
    name: "Harbour Support Co.",
    suburb: "Parramatta",
    state: "NSW",
    postcode: "2150",
    distanceKm: 4.2,
    rating: 4.7,
    reviewCount: 128,
    registered: true,
    categories: ["Support Coordination", "Community Participation"],
    supports: ["In-person", "Telehealth"],
  },
  {
    id: "prov_002",
    slug: "bright-steps-therapy",
    name: "Bright Steps Therapy",
    suburb: "Footscray",
    state: "VIC",
    postcode: "3011",
    distanceKm: 6.9,
    rating: 4.8,
    reviewCount: 76,
    registered: true,
    categories: ["Therapeutic Supports"],
    supports: ["In-person", "Telehealth"],
  },
  {
    id: "prov_003",
    slug: "southern-independent-living",
    name: "Southern Independent Living",
    suburb: "Morphett Vale",
    state: "SA",
    postcode: "5162",
    distanceKm: 9.8,
    rating: 4.5,
    reviewCount: 54,
    registered: false,
    categories: ["Assistance with Daily Life", "Community Participation"],
    supports: ["In-person"],
  },
  {
    id: "prov_004",
    slug: "swan-river-transport",
    name: "Swan River Accessible Transport",
    suburb: "Bayswater",
    state: "WA",
    postcode: "6053",
    distanceKm: 3.4,
    rating: 4.3,
    reviewCount: 41,
    registered: true,
    categories: ["Transport"],
    supports: ["In-person"],
  },
  {
    id: "prov_005",
    slug: "northside-assistive-tech",
    name: "Northside Assistive Tech",
    suburb: "Chermside",
    state: "QLD",
    postcode: "4032",
    distanceKm: 12.1,
    rating: 4.6,
    reviewCount: 93,
    registered: true,
    categories: ["Assistive Technology", "Home Modifications"],
    supports: ["Telehealth"],
  },
  {
    id: "prov_006",
    slug: "capital-employment-pathways",
    name: "Capital Employment Pathways",
    suburb: "Civic",
    state: "ACT",
    postcode: "2601",
    distanceKm: 2.7,
    rating: 4.4,
    reviewCount: 38,
    registered: false,
    categories: ["Employment Supports", "Support Coordination"],
    supports: ["In-person", "Telehealth"],
  },
  {
    id: "prov_007",
    slug: "coastal-home-mods",
    name: "Coastal Home Mods",
    suburb: "Hobart",
    state: "TAS",
    postcode: "7000",
    distanceKm: 5.9,
    rating: 4.2,
    reviewCount: 22,
    registered: true,
    categories: ["Home Modifications"],
    supports: ["In-person"],
  },
  {
    id: "prov_008",
    slug: "top-end-coordination",
    name: "Top End Coordination",
    suburb: "Darwin City",
    state: "NT",
    postcode: "0800",
    distanceKm: 7.3,
    rating: 4.1,
    reviewCount: 19,
    registered: true,
    categories: ["Support Coordination"],
    supports: ["Telehealth"],
  },
  {
    id: "prov_009",
    slug: "riverland-daily-support",
    name: "Riverland Daily Support",
    suburb: "Mildura",
    state: "VIC",
    postcode: "3500",
    distanceKm: 14.6,
    rating: 4.0,
    reviewCount: 11,
    registered: false,
    categories: ["Assistance with Daily Life"],
    supports: ["In-person"],
  },
  {
    id: "prov_010",
    slug: "greenleaf-community",
    name: "Greenleaf Community Connections",
    suburb: "Newcastle",
    state: "NSW",
    postcode: "2300",
    distanceKm: 8.0,
    rating: 4.6,
    reviewCount: 67,
    registered: true,
    categories: ["Community Participation", "Transport"],
    supports: ["In-person", "Telehealth"],
  },
  {
    id: "prov_011",
    slug: "uplift-therapy-telehealth",
    name: "Uplift Therapy (Telehealth)",
    suburb: "Remote",
    state: "NSW",
    postcode: "0000",
    distanceKm: 0,
    rating: 4.9,
    reviewCount: 203,
    registered: true,
    categories: ["Therapeutic Supports"],
    supports: ["Telehealth"],
  },
  {
    id: "prov_012",
    slug: "home-ready-at",
    name: "HomeReady AT & Modifications",
    suburb: "Geelong",
    state: "VIC",
    postcode: "3220",
    distanceKm: 10.2,
    rating: 4.5,
    reviewCount: 45,
    registered: true,
    categories: ["Assistive Technology", "Home Modifications"],
    supports: ["In-person", "Telehealth"],
  },
];

