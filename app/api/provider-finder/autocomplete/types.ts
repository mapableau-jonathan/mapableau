export type AutocompleteItem = {
  id: string;
  type: "provider" | "outlet";
  name: string;
  // todo return for outlets
  providerId: string | null;
  rating: number | null;
  reviewCount: number;
  addressString: string;
  latitude: number;
  longitude: number;
  // suburb: string | null;
  // state: string | null;
  // postcode: string | null;
  // matchedService: string | null;
  // services: string[];
  distanceKm: number;
  ft_rank: number;
  trigram_rank: number;
  services: string[];
};

export type AutocompleteResponse = {
  query: string;
  keepTyping?: boolean;
  fallback?: boolean;
  items: AutocompleteItem[];
};
