export type ParticipantProfileData = {
  id: string;
  slug: string | null;
  displayName: string | null;
  visibility: "private" | "public";
  accessibilityNeeds: string | null;
  preferredCategories: string[];
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  savedProviderIds: string[];
};

export type ParticipantProfilePublic = ParticipantProfileData & {
  savedProviders: { id: string; slug: string; name: string }[];
};
