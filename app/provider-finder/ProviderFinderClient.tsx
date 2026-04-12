"use client";

import {
  ChevronDown,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { cn } from "@/app/lib/utils";
import type { MapSearchView } from "@/components/Map";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { ProviderCard } from "./components/ProviderCard";
import { ProviderOutletCard } from "./components/ProviderOutletCard";
import { useAddressesAndAssociatedProvidersNearby } from "./hooks/useAddressesAndAssociatedProvidersNearby";
import { useUserLocation } from "./hooks/useUserLocation";
import { SelectedProviderOrOutlet } from "./providers";
import { ViewMode } from "./types";

// todo: what does this do?
// "5️⃣ Dynamically import the map (avoid SSR crash)"
const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
});

type SortMode = "relevance" | "distance" | "rating";

const RADIUS_KM = 5;
const MAP_PIN_LIMIT = 100;

const PAGE_SIZE = 9;

function scoreRelevance(
  details: {
    name: string;
    suburb: string | null;
    state: string | null;
    postcode: string | null;
    categories: string[];
  },
  queryRaw: string,
) {
  const query = queryRaw.trim().toLowerCase();
  if (!query) return 0;

  const haystack = [
    details.name,
    details.suburb ?? "",
    details.state ?? "",
    details.postcode ?? "",
    ...details.categories,
  ]
    .join(" ")
    .toLowerCase();

  // Very lightweight relevance: exact name prefix > word match > substring match.
  const name = details.name.toLowerCase();
  if (name.startsWith(query)) return 100;
  const words = query.split(/\s+/).filter(Boolean);
  const wordHits = words.reduce(
    (acc, w) => acc + (haystack.includes(w) ? 1 : 0),
    0,
  );
  const substring = haystack.includes(query) ? 1 : 0;
  return wordHits * 10 + substring * 5;
}

// function ProviderOutletCard({
//   providerOutlet,
//   view,
// }: {
//   providerOutlet: ProviderOutlet;
//   view: ViewMode;
// }) {
//   return <div>ProviderOutletCard</div>;
// }

export default function ProviderFinderClient({
  serviceNamesData,
}: {
  serviceNamesData: { id: string; name: string }[];
}) {
  // todo: clean up and move everything to hooks and components

  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<"all" | string>("all");
  const [registeredOnly, setRegisteredOnly] = useState(false);
  const [view, setView] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<SortMode>("relevance");
  const [page, setPage] = useState(1);
  const {
    coordsReady,
    selectedLocation,
    setSelectedLocation,
    userLocation,
    getUserLocation,
    locationLoading,
    locationError,
  } = useUserLocation({ setPage });
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [selectedProviderOrOutlet, setSelectedProviderOrOutlet] =
    useState<SelectedProviderOrOutlet>(null);
  const [mapSearchViewport, setMapSearchViewport] =
    useState<MapSearchView | null>(null);
  const q = query.trim().toLowerCase();
  const loc = selectedLocation.trim().toLowerCase();

  const onMapViewChange = useCallback((view: MapSearchView) => {
    setMapSearchViewport((prev) => {
      if (
        prev &&
        prev.lat === view.lat &&
        prev.lng === view.lng &&
        prev.radiusKm === view.radiusKm
      ) {
        return prev;
      }
      return view;
    });
  }, []);

  const getUserLocationAndClearMapSearch = useCallback(async () => {
    setMapSearchViewport(null);
    await getUserLocation();
  }, [getUserLocation]);

  const {
    data: addressesAndAssociatedProvidersNearby = [],
    isLoading,
    isError,
    error,
  } = useAddressesAndAssociatedProvidersNearby(
    mapSearchViewport?.lat ?? userLocation?.lat,
    mapSearchViewport?.lng ?? userLocation?.lng,
    mapSearchViewport?.radiusKm ?? RADIUS_KM,
    coordsReady && userLocation != null,
  );

  console.log(
    "addressesAndAssociatedProvidersNearby",
    addressesAndAssociatedProvidersNearby,
  );

  // todo: distinguish between provider and outlets, should these display the same?

  // todo: consider case where address has providers and outlets

  const providers = useMemo(
    () =>
      addressesAndAssociatedProvidersNearby
        .filter((a) => a.address.providers.length > 0)
        .flatMap((a) =>
          a.address.providers.map((p) => ({
            type: "provider" as const,
            provider: p,
            address: a.address,
            distanceKm: a.distanceKm,
          })),
        ),
    [addressesAndAssociatedProvidersNearby],
  );

  const providerOutlets = useMemo(
    () =>
      addressesAndAssociatedProvidersNearby
        .filter((a) => a.address.providerOutlets.length > 0)
        .flatMap((a) =>
          a.address.providerOutlets.map((o) => ({
            type: "outlet" as const,
            providerOutlet: o,
            address: a.address,
            distanceKm: a.distanceKm,
          })),
        ),
    [addressesAndAssociatedProvidersNearby],
  );

  const filteredProviders = useMemo(() => {
    return providers.filter(({ provider: p, address: a }) => {
      if (registeredOnly && !p.ndisRegistered) return false;
      if (
        categoryId !== "all" &&
        // todo: confirm filtering by category works
        !p.services.some(
          (s) =>
            s.serviceDefinition.id.toLowerCase() === categoryId.toLowerCase(),
        )
      )
        return false;

      if (loc) {
        const locHaystack =
          `${a.suburb} ${a.state} ${a.postcode}`.toLowerCase();
        if (!locHaystack.includes(loc)) return false;
      }

      if (q) {
        const haystack = [
          p.name,
          a.suburb,
          a.state,
          a.postcode,
          ...p.services.map((s) => s.serviceDefinition.name),
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [providers, registeredOnly, categoryId, loc, q]);

  const filteredProviderOutlets = useMemo(() => {
    return providerOutlets.filter(({ providerOutlet: o, address: a }) => {
      // todo: consider approach for checking if outlets provider has NDIS registration -- load with JOIN?
      // if (registeredOnly && !o.ndisRegistered) return false;
      if (
        categoryId !== "all" &&
        !o.services.some(
          (s) =>
            s.serviceDefinition.id.toLowerCase() === categoryId.toLowerCase(),
        )
      )
        return false;

      if (loc) {
        const locHaystack =
          `${a.suburb} ${a.state} ${a.postcode}`.toLowerCase();
        if (!locHaystack.includes(loc)) return false;
      }

      if (q) {
        const haystack = [
          o.name,
          a.suburb,
          a.state,
          a.postcode,
          ...o.services.map((s) => s.serviceDefinition.name),
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [providerOutlets, categoryId, loc, q]);

  const filteredCombinedProviderAndOutletAddresses = useMemo(() => {
    return [...filteredProviders, ...filteredProviderOutlets];
  }, [filteredProviders, filteredProviderOutlets]);

  // todo: remove
  // const t = combinedProviderAndOutletAddresses[0];
  // if ("provider" in t) {
  //   const p = t.provider;
  // } else {
  //   const o = t.providerOutlet;
  // }

  // todo: clean up and move to hook
  const filteredSortedCombinedProviderAndOutletAddresses = useMemo(() => {
    const sorted = [...filteredCombinedProviderAndOutletAddresses].sort(
      (a, b) => {
        const aProviderOrOutlet =
          "provider" in a ? a.provider : a.providerOutlet;
        const bProviderOrOutlet =
          "provider" in b ? b.provider : b.providerOutlet;

        if (sort === "distance") return a.distanceKm - b.distanceKm;

        if (
          sort === "rating" &&
          aProviderOrOutlet.rating &&
          bProviderOrOutlet.rating
        )
          return bProviderOrOutlet.rating - aProviderOrOutlet.rating;

        // relevance
        const sa = scoreRelevance(
          {
            name: aProviderOrOutlet.name,
            suburb: a.address.suburb,
            state: a.address.state,
            postcode: a.address.postcode,
            categories: aProviderOrOutlet.services.map(
              (s) => s.serviceDefinition.name,
            ),
          },
          query,
        );
        const sb = scoreRelevance(
          {
            name: bProviderOrOutlet.name,
            suburb: b.address.suburb,
            state: b.address.state,
            postcode: b.address.postcode,
            categories: bProviderOrOutlet.services.map(
              (s) => s.serviceDefinition.name,
            ),
          },
          query,
        );

        if (sb !== sa) return sb - sa;
        return aProviderOrOutlet.name.localeCompare(bProviderOrOutlet.name);
      },
    );

    return sorted;
  }, [filteredCombinedProviderAndOutletAddresses, query, sort]);

  const total = filteredSortedCombinedProviderAndOutletAddresses.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const visible = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredSortedCombinedProviderAndOutletAddresses.slice(
      start,
      start + PAGE_SIZE,
    );
  }, [currentPage, filteredSortedCombinedProviderAndOutletAddresses]);

  // Clamp page when filters/sort reduce total pages.
  useEffect(() => {
    if (page !== currentPage) setPage(currentPage);
  }, [currentPage, page]);

  const clearFilters = () => {
    setQuery("");
    setSelectedLocation("");
    setCategoryId("all");
    setRegisteredOnly(false);
    setSort("relevance");
    setPage(1);
  };

  const hasActiveFilters =
    query.trim() ||
    selectedLocation.trim() ||
    categoryId !== "all" ||
    registeredOnly ||
    sort !== "relevance";

  // if (!coordsReady || isLoading) {
  //   return (
  //     <div className="min-h-screen bg-background flex items-center justify-center py-12">
  //       <Card variant="outlined" className="p-8 text-center max-w-md">
  //         <p className="text-muted-foreground">
  //           {!coordsReady
  //             ? "Getting your location…"
  //             : "Loading nearby providers…"}
  //         </p>
  //       </Card>
  //     </div>
  //   );
  // }

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
                      // ref={searchInputRef}
                      id="provider-search-main"
                      type="text"
                      value={query}
                      onChange={(e) => {
                        // setQuery(e.target.value);
                        // setShowAutocomplete(true);
                        // setSelectedIndex(-1);
                        // setPage(1);
                      }}
                      onFocus={() => {
                        // if (autocompleteSuggestions.length > 0) {
                        //   console.log("showing autocomplete");
                        //   setShowAutocomplete(true);
                        // } else {
                        //   console.log("not showing autocomplete");
                        // }
                      }}
                      placeholder="Provider name or service (e.g. therapy, transport)"
                      className="w-full rounded-lg border border-input bg-background px-9 py-2.5 text-sm shadow-sm outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="min-w-0 space-y-4 pt-0">
                {/* Quick filters */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    Quick filters:
                  </span>
                  {serviceNamesData.slice(0, 5).map((cat) => (
                    <Button
                      key={cat.id}
                      variant={categoryId === cat.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setCategoryId(categoryId === cat.id ? "all" : cat.id);
                        setPage(1);
                      }}
                      type="button"
                      className={cn(
                        "h-8 text-xs",
                        categoryId === cat.id &&
                          "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10",
                      )}
                    >
                      {cat.name}
                    </Button>
                  ))}
                </div>

                {/* Collapsible filters */}
                <div className="border-t border-border pt-4">
                  <div
                    className="flex min-w-0 cursor-pointer flex-col flex-wrap gap-4 pb-4 md:flex-row md:items-end md:justify-between"
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
                    <div className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
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
                      className="flex min-w-0 flex-wrap items-center gap-2"
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

                  {filtersExpanded && (
                    <div className="min-w-0 space-y-4">
                      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
                        <div className="min-w-0 sm:col-span-2 lg:col-span-4">
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
                              className="min-w-0 w-full rounded-lg border border-input bg-background px-9 py-2.5 text-sm shadow-sm outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-ring"
                            />
                          </div>
                        </div>

                        <div className="min-w-0 sm:col-span-2 lg:col-span-4">
                          <label
                            htmlFor="provider-finder-location"
                            className="text-xs font-medium text-muted-foreground"
                          >
                            Location
                          </label>
                          <div className="mt-1 flex min-w-0 gap-2">
                            <input
                              id="provider-finder-location"
                              value={selectedLocation}
                              onChange={(e) => {
                                setSelectedLocation(e.target.value);
                                setPage(1);
                              }}
                              placeholder="Suburb or postcode"
                              className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-ring"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="default"
                              onClick={getUserLocationAndClearMapSearch}
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

                        <div className="min-w-0 lg:col-span-2">
                          <label
                            htmlFor="provider-finder-category"
                            className="text-xs font-medium text-muted-foreground"
                          >
                            Category
                          </label>
                          <select
                            id="provider-finder-category"
                            value={categoryId}
                            onChange={(e) => {
                              setCategoryId(e.target.value);
                              setPage(1);
                            }}
                            className="mt-1 min-w-0 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-ring"
                          >
                            <option value="all">All</option>
                            {serviceNamesData.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="min-w-0 lg:col-span-2">
                          <label
                            htmlFor="provider-finder-sort"
                            className="text-xs font-medium text-muted-foreground"
                          >
                            Sort
                          </label>
                          <select
                            id="provider-finder-sort"
                            value={sort}
                            onChange={(e) =>
                              setSort(e.target.value as SortMode)
                            }
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
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="container mx-auto mt-8 px-4">
          {!userLocation &&
          filteredSortedCombinedProviderAndOutletAddresses.length >
            MAP_PIN_LIMIT ? (
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
                onClick={getUserLocationAndClearMapSearch}
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
          <Map
            providers={filteredProviders}
            providerOutlets={filteredProviderOutlets}
            userPosition={userLocation}
            addressToCenterOn={selectedProviderOrOutlet ?? null}
            onViewChange={onMapViewChange}
            fitBoundsPolicy="initial-only"
          />
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
                  {visible.map((p) => {
                    if (p.type === "provider" && "provider" in p) {
                      return (
                        <ProviderCard
                          key={p.provider.id}
                          address={p.address}
                          provider={p.provider}
                          view={view}
                          onSelect={
                            (providerOrOutletAddress) => {}
                            // setSelectedProviderOrOutlet(providerOrOutletAddress)
                          }
                          isSelected={
                            selectedProviderOrOutlet?.type === "provider" &&
                            selectedProviderOrOutlet.provider.id ===
                              p.provider.id
                          }
                          distanceKm={p.distanceKm}
                        />
                      );
                    } else if (p.type === "outlet" && "providerOutlet" in p) {
                      return (
                        <ProviderOutletCard
                          key={p.providerOutlet.id}
                          address={p.address}
                          distanceKm={p.distanceKm}
                          providerOutlet={p.providerOutlet}
                          view={view}
                        />
                      );
                    }
                  })}
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
