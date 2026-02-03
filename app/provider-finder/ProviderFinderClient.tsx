"use client";

import {
  ChevronDown,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/app/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  distanceKm,
  getLocationAndPostcode,
  type UserPosition,
} from "@/lib/geo";
import { useProviderOutlets } from "@/lib/use-provider-outlets";

import { mapOutletsToProviders } from "./outletToProvider";
import { type Provider } from "./providers";

// todo: what does this do?
// "5️⃣ Dynamically import the map (avoid SSR crash)"
const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
});

type ViewMode = "grid" | "list";
type SortMode = "relevance" | "distance" | "rating";

const RADIUS_KM = 50;
const MAP_PIN_LIMIT = 500;

function formatLocation(provider: Provider) {
  if (provider.suburb === "Remote") return "Telehealth (Australia-wide)";
  return `${provider.suburb} ${provider.state} ${provider.postcode}`;
}

function clampRating(rating: number) {
  if (Number.isNaN(rating)) return 0;
  return Math.max(0, Math.min(5, rating));
}

function scoreRelevance(provider: Provider, queryRaw: string) {
  const query = queryRaw.trim().toLowerCase();
  if (!query) return 0;

  const haystack = [
    provider.name,
    provider.suburb,
    provider.state,
    provider.postcode,
    ...provider.categories,
    ...provider.supports,
  ]
    .join(" ")
    .toLowerCase();

  // Very lightweight relevance: exact name prefix > word match > substring match.
  const name = provider.name.toLowerCase();
  if (name.startsWith(query)) return 100;
  const words = query.split(/\s+/).filter(Boolean);
  const wordHits = words.reduce(
    (acc, w) => acc + (haystack.includes(w) ? 1 : 0),
    0,
  );
  const substring = haystack.includes(query) ? 1 : 0;
  return wordHits * 10 + substring * 5;
}

function ProviderCard({
  provider,
  view,
}: {
  provider: Provider;
  view: ViewMode;
}) {
  const rating = clampRating(provider.rating);
  const showDistance = provider.distanceKm > 0 && provider.suburb !== "Remote";

  return (
    <Card variant={view === "grid" ? "interactive" : "outlined"}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base sm:text-lg truncate">
              {provider.name}
            </CardTitle>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {formatLocation(provider)}
              </span>
              {showDistance ? (
                <span className="rounded-md bg-accent px-2 py-0.5 text-xs text-foreground">
                  {provider.distanceKm.toFixed(1)} km away
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            {provider.registered ? (
              <Badge
                variant="outline"
                className="border-primary/20 bg-primary/5 text-primary"
              >
                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                Registered
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-border bg-background text-muted-foreground"
              >
                Unregistered
              </Badge>
            )}

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="font-medium text-foreground">
                {rating.toFixed(1)}
              </span>
              <span>({provider.reviewCount})</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {provider.categories.slice(0, 3).map((cat) => (
            <Badge key={cat} variant="outline" className="bg-background">
              {cat}
            </Badge>
          ))}
          {provider.categories.length > 3 ? (
            <Badge
              variant="outline"
              className="bg-background text-muted-foreground"
            >
              +{provider.categories.length - 3} more
            </Badge>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="font-medium text-foreground">Support modes:</span>
            {provider.supports.map((s) => (
              <span
                key={s}
                className="rounded-md border border-border/70 bg-card px-2 py-0.5"
              >
                {s}
              </span>
            ))}
          </span>
        </div>
      </CardContent>

      <CardFooter className="gap-2">
        <Button variant="outline" size="default" className="flex-1">
          View profile
        </Button>
        <Button variant="default" size="default" className="flex-1">
          Contact
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function ProviderFinderClient() {
  const { data: outlets, isLoading, isError, error } = useProviderOutlets();
  const providers = useMemo(
    () => (outlets ? mapOutletsToProviders(outlets) : []),
    [outlets],
  );
  const providerCategories = useMemo(() => {
    const set = new Set<string>();
    providers.forEach((p) => p.categories.forEach((c) => set.add(c)));
    return Array.from(set).sort();
  }, [providers]);

  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [registeredOnly, setRegisteredOnly] = useState(false);
  const [telehealthOnly, setTelehealthOnly] = useState(false);
  const [view, setView] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<SortMode>("relevance");
  const [page, setPage] = useState(1);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [userLocation, setUserLocation] = useState<UserPosition | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  const pageSize = 9;

  const useMyLocation = async () => {
    setLocationLoading(true);
    setLocationError(null);
    try {
      const { position, postcode } = await getLocationAndPostcode();
      setUserLocation(position);
      setLocation(postcode);
      setPage(1);
    } catch (e) {
      setLocationError(
        e instanceof Error ? e.message : "Could not get your location",
      );
    } finally {
      setLocationLoading(false);
    }
  };

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const loc = location.trim().toLowerCase();
    const cat = category;

    const filtered = providers.filter((p) => {
      if (registeredOnly && !p.registered) return false;
      if (telehealthOnly && !p.supports.includes("Telehealth")) return false;
      if (cat !== "all" && !p.categories.includes(cat)) return false;

      if (loc) {
        const locHaystack =
          `${p.suburb} ${p.state} ${p.postcode}`.toLowerCase();
        if (!locHaystack.includes(loc)) return false;
      }

      if (q) {
        const haystack = [
          p.name,
          p.suburb,
          p.state,
          p.postcode,
          ...p.categories,
          ...p.supports,
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(q)) return false;
      }

      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sort === "distance") return a.distanceKm - b.distanceKm;
      if (sort === "rating") return b.rating - a.rating;

      // relevance
      const sa = scoreRelevance(a, query);
      const sb = scoreRelevance(b, query);
      if (sb !== sa) return sb - sa;
      return a.name.localeCompare(b.name);
    });

    return sorted;
  }, [
    category,
    location,
    providers,
    query,
    registeredOnly,
    sort,
    telehealthOnly,
  ]);

  const total = filteredSorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);

  const visible = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSorted.slice(start, start + pageSize);
  }, [currentPage, filteredSorted]);

  const mapProviders = useMemo(() => {
    let list = filteredSorted;
    if (userLocation) {
      list = list.filter((p) => {
        if (p.latitude == null || p.longitude == null) return false;
        const d = distanceKm(
          userLocation.lat,
          userLocation.lng,
          p.latitude,
          p.longitude,
        );
        return d <= RADIUS_KM;
      });
    }
    // todo: if no location then set to city and use radius around that? or require post code to be entered?
    return list.slice(0, MAP_PIN_LIMIT);
  }, [filteredSorted, userLocation]);

  // Clamp page when filters/sort reduce total pages.
  useEffect(() => {
    if (page !== currentPage) setPage(currentPage);
  }, [currentPage, page]);

  // Generate autocomplete suggestions
  const autocompleteSuggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];

    const suggestions: Array<{
      type: "provider" | "category" | "location";
      label: string;
      value: string;
      action: () => void;
    }> = [];

    // Provider name suggestions
    providers
      .filter((p) => p.name.toLowerCase().includes(q))
      .forEach((provider) => {
        suggestions.push({
          type: "provider",
          label: provider.name,
          value: provider.name,
          action: () => {
            setQuery(provider.name);
            setShowAutocomplete(false);
            setPage(1);
          },
        });
      });

    // Category suggestions
    providerCategories
      .filter((cat) => cat.toLowerCase().includes(q))
      .forEach((cat) => {
        suggestions.push({
          type: "category",
          label: cat,
          value: cat,
          action: () => {
            setCategory(cat);
            setQuery("");
            setShowAutocomplete(false);
            setPage(1);
          },
        });
      });

    // Location suggestions (unique suburbs and states)
    const locations = new Set<string>();
    providers.forEach((p) => {
      if (p.suburb.toLowerCase().includes(q) && p.suburb !== "Remote") {
        locations.add(`${p.suburb}, ${p.state}`);
      }
      if (p.state.toLowerCase().includes(q)) {
        locations.add(p.state);
      }
    });
    Array.from(locations).forEach((loc) => {
      suggestions.push({
        type: "location",
        label: loc,
        value: loc,
        action: () => {
          setLocation(loc.split(",")[0].trim());
          setQuery("");
          setShowAutocomplete(false);
          setPage(1);
        },
      });
    });

    return suggestions.slice(0, 8); // Limit to 8 suggestions
  }, [providerCategories, providers, query]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showAutocomplete || autocompleteSuggestions.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < autocompleteSuggestions.length - 1 ? prev + 1 : prev,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        autocompleteSuggestions[selectedIndex].action();
      } else if (e.key === "Escape") {
        setShowAutocomplete(false);
        setSelectedIndex(-1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAutocomplete, autocompleteSuggestions, selectedIndex]);

  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowAutocomplete(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const clearFilters = () => {
    setQuery("");
    setLocation("");
    setCategory("all");
    setRegisteredOnly(false);
    setTelehealthOnly(false);
    setSort("relevance");
    setPage(1);
  };

  const hasActiveFilters =
    query.trim() ||
    location.trim() ||
    category !== "all" ||
    registeredOnly ||
    telehealthOnly ||
    sort !== "relevance";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center py-12">
        <Card variant="outlined" className="p-8 text-center max-w-md">
          <p className="text-muted-foreground">Loading providers…</p>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center py-12">
        <Card variant="outlined" className="p-8 text-center max-w-md">
          <h2 className="text-lg font-semibold">Could not load providers</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Something went wrong."}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="py-12">
        {/* <section className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <Badge
              variant="outline"
              className="mb-4 border-primary/20 bg-primary/5 px-3 py-1.5 text-primary"
            >
              Provider Finder
            </Badge>
            <h1 className="text-3xl font-heading font-bold leading-tight sm:text-4xl">
              Find NDIS providers near you
            </h1>
            <p className="mt-3 text-muted-foreground">
              Search registered and unregistered providers, filter by service
              category, and compare options in a simple grid view.
            </p>
          </div>
        </section> */}

        {/* Provider search bar with input */}
        <section className="container mx-auto mt-8 px-4">
          <div className="mx-auto max-w-6xl">
            <Card variant="gradient">
              <CardHeader className="pb-4">
                <div className="w-full">
                  <label
                    htmlFor="provider-search-main"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Search
                  </label>
                  <div className="relative mt-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      ref={searchInputRef}
                      id="provider-search-main"
                      type="text"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setShowAutocomplete(true);
                        setSelectedIndex(-1);
                        setPage(1);
                      }}
                      onFocus={() => {
                        if (autocompleteSuggestions.length > 0) {
                          console.log("showing autocomplete");
                          setShowAutocomplete(true);
                        } else {
                          console.log("not showing autocomplete");
                        }
                      }}
                      placeholder="Provider name or service (e.g. therapy, transport)"
                      className="w-full rounded-lg border border-input bg-background px-9 py-2.5 text-sm shadow-sm outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-ring"
                    />
                    {showAutocomplete && autocompleteSuggestions.length > 0 && (
                      <div
                        ref={autocompleteRef}
                        className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-background shadow-lg"
                      >
                        <div className="max-h-64 overflow-y-auto p-1">
                          {autocompleteSuggestions.map((suggestion, index) => (
                            <button
                              key={`${suggestion.type}-${suggestion.value}-${index}`}
                              type="button"
                              onClick={suggestion.action}
                              className={cn(
                                "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                                index === selectedIndex
                                  ? "bg-primary/10 text-primary"
                                  : "hover:bg-accent",
                              )}
                            >
                              <div className="flex items-center gap-2">
                                {suggestion.type === "provider" && (
                                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                                {suggestion.type === "category" && (
                                  <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                                {suggestion.type === "location" && (
                                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                                <span className="font-medium">
                                  {suggestion.label}
                                </span>
                                <span className="ml-auto text-xs text-muted-foreground">
                                  {suggestion.type === "provider" && "Provider"}
                                  {suggestion.type === "category" && "Category"}
                                  {suggestion.type === "location" && "Location"}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* Quick filter buttons */}
        <section className="container mx-auto mt-8 px-4">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Quick filters:
              </span>
              {providerCategories.slice(0, 5).map((cat) => (
                <Button
                  key={cat}
                  variant={category === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setCategory(category === cat ? "all" : cat);
                    setPage(1);
                  }}
                  type="button"
                  className={cn(
                    "h-8 text-xs",
                    category === cat &&
                      "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10",
                  )}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto mt-8 px-4">
          <div className="mx-auto max-w-6xl">
            <Card variant="gradient">
              <CardHeader
                className="pb-4 cursor-pointer"
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setFiltersExpanded(!filtersExpanded);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-expanded={filtersExpanded}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        filtersExpanded && "rotate-180",
                      )}
                    />
                  </div>

                  <div
                    className="flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    role="none"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "gap-2",
                        view === "grid" &&
                          "border-primary/30 bg-primary/5 text-primary",
                      )}
                      onClick={() => setView("grid")}
                      type="button"
                    >
                      <LayoutGrid className="h-4 w-4" />
                      Grid
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "gap-2",
                        view === "list" &&
                          "border-primary/30 bg-primary/5 text-primary",
                      )}
                      onClick={() => setView("list")}
                      type="button"
                    >
                      <List className="h-4 w-4" />
                      List
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearFilters}
                      type="button"
                      disabled={!hasActiveFilters}
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Clear
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {filtersExpanded && (
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-12">
                    <div className="md:col-span-5">
                      <label
                        htmlFor="provider-finder-search"
                        className="text-xs font-medium text-muted-foreground"
                      >
                        Search
                      </label>
                      <div className="relative mt-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          id="provider-finder-search"
                          value={query}
                          onChange={(e) => {
                            setQuery(e.target.value);
                            setPage(1);
                          }}
                          placeholder="Provider name or service (e.g. therapy, transport)"
                          className="w-full rounded-lg border border-input bg-background px-9 py-2.5 text-sm shadow-sm outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-3">
                      <label
                        htmlFor="provider-finder-location"
                        className="text-xs font-medium text-muted-foreground"
                      >
                        Location
                      </label>
                      <div className="mt-1 flex gap-2">
                        <input
                          id="provider-finder-location"
                          value={location}
                          onChange={(e) => {
                            setLocation(e.target.value);
                            setPage(1);
                          }}
                          placeholder="Suburb or postcode"
                          className="flex-1 rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-ring"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="default"
                          onClick={useMyLocation}
                          disabled={locationLoading}
                          className="shrink-0 gap-1.5 px-3"
                          title="Use my location to set postcode and show nearby providers"
                        >
                          {locationLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MapPin className="h-4 w-4" />
                          )}
                          <span className="hidden sm:inline">
                            Use my location
                          </span>
                        </Button>
                      </div>
                      {locationError ? (
                        <p className="mt-1 text-xs text-destructive">
                          {locationError}
                        </p>
                      ) : null}
                    </div>

                    <div className="md:col-span-2">
                      <label
                        htmlFor="provider-finder-category"
                        className="text-xs font-medium text-muted-foreground"
                      >
                        Category
                      </label>
                      <select
                        id="provider-finder-category"
                        value={category}
                        onChange={(e) => {
                          setCategory(e.target.value);
                          setPage(1);
                        }}
                        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-ring"
                      >
                        <option value="all">All</option>
                        {providerCategories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label
                        htmlFor="provider-finder-sort"
                        className="text-xs font-medium text-muted-foreground"
                      >
                        Sort
                      </label>
                      <select
                        id="provider-finder-sort"
                        value={sort}
                        onChange={(e) => setSort(e.target.value as SortMode)}
                        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-ring"
                      >
                        <option value="relevance">Relevance</option>
                        <option value="distance">Distance</option>
                        <option value="rating">Rating</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={registeredOnly}
                          onChange={(e) => {
                            setRegisteredOnly(e.target.checked);
                            setPage(1);
                          }}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                        />
                        Registered only
                      </label>

                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={telehealthOnly}
                          onChange={(e) => {
                            setTelehealthOnly(e.target.checked);
                            setPage(1);
                          }}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                        />
                        Telehealth only
                      </label>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      Showing{" "}
                      <span className="font-medium text-foreground">
                        {visible.length}
                      </span>{" "}
                      of{" "}
                      <span className="font-medium text-foreground">
                        {total}
                      </span>{" "}
                      providers
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </section>

        <section className="container mx-auto mt-8 px-4">
          {!userLocation && filteredSorted.length > MAP_PIN_LIMIT ? (
            <Card variant="outlined" className="mb-4 p-4">
              <p className="text-sm text-muted-foreground">
                Set a location (or use &quot;Use my location&quot;) to see
                providers on the map. Showing all results would add too many
                pins.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 gap-1.5"
                onClick={useMyLocation}
                disabled={locationLoading}
              >
                {locationLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
                Use my location
              </Button>
            </Card>
          ) : null}
          <Map providers={mapProviders} userPosition={userLocation} />
        </section>

        <section className="container mx-auto mt-8 px-4">
          <div className="mx-auto max-w-6xl">
            {total === 0 ? (
              <Card variant="outlined" className="p-8 text-center">
                <div className="mx-auto max-w-md">
                  <h2 className="text-lg font-semibold">No providers found</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Try removing a filter or searching a broader term.
                  </p>
                  <div className="mt-5 flex justify-center">
                    <Button
                      variant="outline"
                      size="default"
                      onClick={clearFilters}
                      type="button"
                    >
                      Clear filters
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <>
                <div
                  className={cn(
                    view === "grid"
                      ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                      : "flex flex-col gap-4",
                  )}
                >
                  {visible.map((p) => (
                    <ProviderCard key={p.id} provider={p} view={view} />
                  ))}
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-muted-foreground">
                    Page{" "}
                    <span className="font-medium text-foreground">
                      {currentPage}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-foreground">
                      {totalPages}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="default"
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="default"
                      type="button"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
