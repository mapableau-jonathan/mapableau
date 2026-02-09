"use client";

import { Loader2, MapPin } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { useParticipantConsumer } from "@/app/contexts/ParticipantConsumerContext";
import Footer from "@/components/footer";
import { SiteHeader } from "@/components/layout/SiteHeader";
import {
  ErrorState,
  FilterPanel,
  LoadingState,
  Pagination,
  ProviderResults,
  QuickFilters,
  SearchBar,
} from "@/components/provider-finder";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildPath } from "@/lib/router";

import { useProviderFinder } from "./useProviderFinder";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function ProviderFinderClient() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { participant, isLoading: participantLoading } = useParticipantConsumer();
  const {
    isLoading,
    isError,
    error,
    visible,
    total,
    totalPages,
    currentPage,
    setPage,
    mapProviders,
    userLocation,
    filteredSorted,
    MAP_PIN_LIMIT,
    query,
    setQuery,
    handleSearchChange,
    handleSearchFocus,
    autocompleteSuggestions,
    showAutocomplete,
    selectedIndex,
    handleSuggestionSelect,
    onSuggestionHover,
    searchInputRef,
    autocompleteRef,
    providerCategories,
    category,
    setCategory,
    view,
    setView,
    filtersExpanded,
    setFiltersExpanded,
    clearFilters,
    hasActiveFilters,
    location,
    setLocation,
    useMyLocation,
    locationLoading,
    locationError,
    sort,
    setSort,
    registeredOnly,
    setRegisteredOnly,
    telehealthOnly,
    setTelehealthOnly,
    router,
  } = useProviderFinder();

  // Pre-fill from URL (location, category, search query from TopBarSearch)
  useEffect(() => {
    const postcode = searchParams.get("postcode") ?? "";
    const suburb = searchParams.get("suburb") ?? "";
    const state = searchParams.get("state") ?? "";
    const urlCategory = searchParams.get("category") ?? "";
    const urlQuery = searchParams.get("q") ?? "";

    const locationParts = [suburb, state, postcode].filter(Boolean) as string[];
    const locationValue = locationParts.length ? locationParts.join(", ") : "";
    let applied = false;
    if (locationValue && !location.trim()) {
      setLocation(locationValue);
      setPage(1);
      applied = true;
    }
    if (urlCategory && providerCategories.includes(urlCategory) && category === "all") {
      setCategory(urlCategory);
      setPage(1);
      applied = true;
    }
    if (urlQuery && !query.trim()) {
      setQuery(urlQuery);
      setPage(1);
      applied = true;
    }
    if (applied && pathname) {
      router.replace(pathname, { scroll: false });
    }
  }, [pathname, searchParams, location, query, category, providerCategories, setLocation, setCategory, setQuery, setPage, router]);

  // Pre-fill location and category from participant (emulated or real) when empty
  useEffect(() => {
    if (participantLoading || !participant) return;
    const locationParts = [
      participant.suburb,
      participant.state,
      participant.postcode,
    ].filter(Boolean) as string[];
    const locationValue = locationParts.length ? locationParts.join(", ") : "";
    if (locationValue && !location.trim()) {
      setLocation(locationValue);
      setPage(1);
    }
    const firstPreferred = participant.preferredCategories?.[0];
    if (
      firstPreferred &&
      category === "all" &&
      providerCategories.includes(firstPreferred)
    ) {
      setCategory(firstPreferred);
      setPage(1);
    }
  }, [
    participant,
    participantLoading,
    location,
    category,
    providerCategories,
    setLocation,
    setCategory,
    setPage,
  ]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return (
      <ErrorState
        message={
          error instanceof Error ? error.message : "Something went wrong."
        }
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader variant="appBar" />
      <header className="page-hero">
        <div className="content-width">
          <nav className="mb-4 text-sm text-muted-foreground" aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1">
              <li>
                <Link href="/" className="hover:text-foreground underline rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-foreground font-medium" aria-current="page">
                Find Care Provider
              </li>
            </ol>
          </nav>
          <h1 className="text-display font-heading font-bold text-foreground">
            Find a provider
          </h1>
          <p className="mt-3 text-lead text-muted-foreground max-w-2xl">
            Search for providers by name, location or category. Filter by registered providers and support type (e.g. Telehealth).
          </p>
          <section
            className="mt-6 rounded-xl border border-border bg-muted/40 px-5 py-4"
            aria-label="Provider registration"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-foreground">
                Are you a provider? Register your practice or claim your existing listing.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="default" size="default" className="rounded-lg">
                  <Link href={buildPath("providerRegister", {})}>Register as a provider</Link>
                </Button>
                <Button asChild variant="outline" size="default" className="rounded-lg">
                  <Link href={`${buildPath("providerFinder", {})}#search`}>Find and claim your listing</Link>
                </Button>
              </div>
            </div>
          </section>
        </div>
      </header>

      <main className="content-width section flex-1" id="main-content">

        <section
          id="search"
          className="mt-6"
          aria-label="Search providers"
        >
          <SearchBar
              id="provider-search-main"
              value={query}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
              suggestions={autocompleteSuggestions}
              showSuggestions={showAutocomplete}
              selectedIndex={selectedIndex}
              onSuggestionSelect={handleSuggestionSelect}
              onSuggestionHover={onSuggestionHover}
              inputRef={searchInputRef}
              dropdownRef={autocompleteRef}
              variant="hero"
            />
        </section>

        <section className="mt-8">
          <QuickFilters
              categories={providerCategories}
              selectedCategory={category}
              onCategoryChange={(c) => {
                setCategory(c);
                setPage(1);
              }}
            />
        </section>

        {/* Filters + view controls */}
        <section className="mt-8">
          <FilterPanel
              expanded={filtersExpanded}
              onToggleExpanded={() => setFiltersExpanded(!filtersExpanded)}
              view={view}
              onViewChange={setView}
              onClearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
              searchId="provider-finder-search"
              query={query}
              onQueryChange={(v) => {
                handleSearchChange(v);
              }}
              onSearchFocus={handleSearchFocus}
              suggestions={autocompleteSuggestions}
              showSuggestions={showAutocomplete}
              selectedSuggestionIndex={selectedIndex}
              onSuggestionSelect={handleSuggestionSelect}
              onSuggestionHover={onSuggestionHover}
              searchInputRef={searchInputRef}
              searchDropdownRef={autocompleteRef}
              location={location}
              onLocationChange={(v) => {
                setLocation(v);
                setPage(1);
              }}
              onUseMyLocation={useMyLocation}
              locationLoading={locationLoading}
              locationError={locationError}
              category={category}
              onCategoryChange={(v) => {
                setCategory(v);
                setPage(1);
              }}
              categoryOptions={providerCategories}
              sort={sort}
              onSortChange={setSort}
              registeredOnly={registeredOnly}
              onRegisteredOnlyChange={(v) => {
                setRegisteredOnly(v);
                setPage(1);
              }}
              telehealthOnly={telehealthOnly}
              onTelehealthOnlyChange={(v) => {
                setTelehealthOnly(v);
                setPage(1);
              }}
              visibleCount={visible.length}
              totalCount={total}
            />
        </section>

        {/* Map */}
        <section className="mt-8">
          {!userLocation && filteredSorted.length > MAP_PIN_LIMIT ? (
            <Card variant="outlined" className="mb-4 p-4">
              <p className="text-sm text-muted-foreground">
                Set a location (or use &quot;Use my location&quot;) to see
                providers on the map. Showing all results would add too many pins.
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
          <Map
            providers={mapProviders}
            userPosition={userLocation}
            centerOnProvider={undefined}
          />
        </section>

        <section className="mt-10">
          <ProviderResults
              providers={visible}
              view={view}
              onProviderSelect={(provider) =>
                router.push(buildPath("outletProfile", { slug: provider.slug }))
              }
              onClearFilters={clearFilters}
            />
          {total > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPrevious={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
