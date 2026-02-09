"use client";

import { ChevronDown, LayoutGrid, List, Loader2, MapPin, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { SearchBar } from "./SearchBar";
import type { AutocompleteSuggestion } from "./types";
import type { SortMode, ViewMode } from "./types";

type FilterPanelProps = {
  expanded: boolean;
  onToggleExpanded: () => void;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  /** Search (shared with hero) */
  searchId: string;
  query: string;
  onQueryChange: (value: string) => void;
  onSearchFocus?: () => void;
  suggestions: AutocompleteSuggestion[];
  showSuggestions: boolean;
  selectedSuggestionIndex: number;
  onSuggestionSelect: (index: number) => void;
  onSuggestionHover: (index: number) => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  searchDropdownRef?: React.RefObject<HTMLDivElement | null>;
  /** Location */
  location: string;
  onLocationChange: (value: string) => void;
  onUseMyLocation: () => void;
  locationLoading: boolean;
  locationError: string | null;
  /** Category select */
  category: string;
  onCategoryChange: (value: string) => void;
  categoryOptions: string[];
  /** Sort */
  sort: SortMode;
  onSortChange: (value: SortMode) => void;
  /** Checkboxes */
  registeredOnly: boolean;
  onRegisteredOnlyChange: (value: boolean) => void;
  telehealthOnly: boolean;
  onTelehealthOnlyChange: (value: boolean) => void;
  /** Counts */
  visibleCount: number;
  totalCount: number;
};

export function FilterPanel({
  expanded,
  onToggleExpanded,
  view,
  onViewChange,
  onClearFilters,
  hasActiveFilters,
  searchId,
  query,
  onQueryChange,
  onSearchFocus,
  suggestions,
  showSuggestions,
  selectedSuggestionIndex,
  onSuggestionSelect,
  onSuggestionHover,
  searchInputRef,
  searchDropdownRef,
  location,
  onLocationChange,
  onUseMyLocation,
  locationLoading,
  locationError,
  category,
  onCategoryChange,
  categoryOptions,
  sort,
  onSortChange,
  registeredOnly,
  onRegisteredOnlyChange,
  telehealthOnly,
  onTelehealthOnlyChange,
  visibleCount,
  totalCount,
}: FilterPanelProps) {
  return (
    <Card variant="gradient">
      <CardHeader
        className="pb-4 cursor-pointer"
        onClick={onToggleExpanded}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleExpanded();
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                expanded && "rotate-180",
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
              onClick={() => onViewChange("grid")}
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
              onClick={() => onViewChange("list")}
              type="button"
            >
              <List className="h-4 w-4" />
              List
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
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

      {expanded && (
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-12">
            <div className="md:col-span-5">
              <SearchBar
                id={searchId}
                value={query}
                onChange={onQueryChange}
                onFocus={onSearchFocus}
                suggestions={suggestions}
                showSuggestions={showSuggestions}
                selectedIndex={selectedSuggestionIndex}
                onSuggestionSelect={onSuggestionSelect}
                onSuggestionHover={onSuggestionHover}
                inputRef={searchInputRef}
                dropdownRef={searchDropdownRef}
                variant="inline"
              />
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
                  onChange={(e) => onLocationChange(e.target.value)}
                  placeholder="Suburb or postcode"
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-ring"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={onUseMyLocation}
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
                onChange={(e) => onCategoryChange(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-ring"
              >
                <option value="all">All</option>
                {categoryOptions.map((c) => (
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
                onChange={(e) => onSortChange(e.target.value as SortMode)}
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
                  onChange={(e) => onRegisteredOnlyChange(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                />
                Registered only
              </label>

              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={telehealthOnly}
                  onChange={(e) => onTelehealthOnlyChange(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                />
                Telehealth only
              </label>
            </div>

            <div className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {visibleCount}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {totalCount}
              </span>{" "}
              providers
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
