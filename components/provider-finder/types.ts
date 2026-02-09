export type AutocompleteSuggestionType = "provider" | "category" | "location";

export type AutocompleteSuggestion = {
  type: AutocompleteSuggestionType;
  label: string;
  value: string;
  action?: () => void;
};

export type SortMode = "relevance" | "distance" | "rating";

export type ViewMode = "grid" | "list";
