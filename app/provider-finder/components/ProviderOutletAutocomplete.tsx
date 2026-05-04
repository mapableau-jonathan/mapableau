"use client";

import { Loader2, MapPin, Search, Star, TriangleAlert } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { AutocompleteItem } from "@/app/api/provider-finder/autocomplete/types";
import { cn } from "@/app/lib/utils";
import { MapSearchView } from "@/components/Map";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

import { useProviderOutletAutocomplete } from "../hooks/useProviderOutletAutocomplete";

type ProviderOutletAutocompleteProps = {
  id?: string;
  mapSearchView: MapSearchView | null;
  latitude?: number;
  longitude?: number;
  value: string;
  onValueChange: (value: string) => void;
  onSelect?: (item: AutocompleteItem) => void;
  placeholder?: string;
  className?: string;
};

function highlightText(text: string, query: string) {
  const q = query.trim();
  if (!q) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = q.toLowerCase();
  const matchStart = lowerText.indexOf(lowerQuery);
  if (matchStart < 0) return text;

  const matchEnd = matchStart + q.length;
  const before = text.slice(0, matchStart);
  const match = text.slice(matchStart, matchEnd);
  const after = text.slice(matchEnd);

  return (
    <>
      {before}
      <mark className="rounded bg-primary/15 px-0.5 text-foreground">
        {match}
      </mark>
      {after}
    </>
  );
}

export default function ProviderOutletAutocomplete({
  id,
  mapSearchView,
  latitude,
  longitude,
  value,
  onValueChange,
  onSelect,
  placeholder = "Search providers, outlets, or services...",
  className,
}: ProviderOutletAutocompleteProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listboxId = useId();
  const isAwaitingMapSearchView =
    mapSearchView == null || latitude == null || longitude == null;

  // todo: move into autocomplete search bar once data has finished loading?
  const {
    items,
    queryResult: { isFetching, isError, error },
    keepTyping,
    minChars,
    fallback,
    debouncedQuery,
  } = useProviderOutletAutocomplete({
    query: value,
    mapSearchView,
    latitude,
    longitude,
    enabled: isOpen && !isAwaitingMapSearchView,
  });

  useEffect(() => {
    setActiveIndex(-1);
  }, [debouncedQuery]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [isOpen]);

  const showPanel = isOpen && (value.trim().length > 0 || isFetching);
  const hasResults = items.length > 0;
  const activeItem = useMemo(
    () => (activeIndex >= 0 ? items[activeIndex] : null),
    [activeIndex, items],
  );

  const selectItem = (item: AutocompleteItem) => {
    onValueChange(item.name);
    onSelect?.(item);
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        id={id}
        ref={inputRef}
        value={value}
        disabled={isAwaitingMapSearchView}
        onChange={(event) => {
          onValueChange(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setIsOpen(false);
            setActiveIndex(-1);
            return;
          }

          if (!showPanel) return;

          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((prev) => {
              if (items.length === 0) return -1;
              return prev < items.length - 1 ? prev + 1 : 0;
            });
            return;
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((prev) => {
              if (items.length === 0) return -1;
              return prev <= 0 ? items.length - 1 : prev - 1;
            });
            return;
          }

          if (event.key === "Enter") {
            if (activeItem) {
              event.preventDefault();
              selectItem(activeItem);
            }
            return;
          }
        }}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
        }
        aria-busy={isAwaitingMapSearchView}
        className="w-full rounded-lg border border-input bg-background px-9 py-2.5 text-sm shadow-sm outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-ring"
      />
      {isAwaitingMapSearchView ? (
        <span className="pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2">
          <Loader2
            className="h-4 w-4 animate-spin text-muted-foreground"
            aria-hidden
          />
        </span>
      ) : null}

      {showPanel ? (
        <Card
          variant="outlined"
          className="absolute z-[500] mt-2 w-full overflow-hidden border-border/80 bg-background shadow-lg"
        >
          <div
            id={listboxId}
            role="listbox"
            className="max-h-[420px] overflow-y-auto p-2"
          >
            {keepTyping ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                Keep typing - enter at least{" "}
                <span className="font-medium">{minChars}</span> characters.
              </div>
            ) : null}

            {!keepTyping && isFetching ? (
              <div className="flex items-center gap-2 rounded-lg p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading suggestions...
              </div>
            ) : null}

            {!keepTyping && !isFetching && isError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                <div className="flex items-center gap-2 font-medium">
                  <TriangleAlert className="h-4 w-4" />
                  We could not load suggestions.
                </div>
                <p className="mt-1 text-xs opacity-90">
                  {error instanceof Error
                    ? error.message
                    : "Please try again in a moment."}
                </p>
              </div>
            ) : null}

            {!keepTyping && !isFetching && !isError && fallback ? (
              <div className="mb-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                Search is taking longer than usual. Showing fallback
                suggestions.
              </div>
            ) : null}

            {!keepTyping && !isFetching && !isError && !hasResults ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                No matches yet. Try a provider name, suburb, or service.
              </div>
            ) : null}

            {!keepTyping && !isFetching && !isError && hasResults ? (
              <div className="space-y-2">
                {items.map((item, index) => {
                  const isActive = index === activeIndex;
                  const resultTypeLabel =
                    item.type === "provider" ? "Provider" : "Outlet";

                  return (
                    <button
                      key={`${item.type}-${item.id}`}
                      id={`${listboxId}-option-${index}`}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => selectItem(item)}
                      className={cn(
                        "w-full rounded-lg border px-3 py-3 text-left transition",
                        isActive
                          ? "border-primary/40 bg-primary/5 shadow-sm"
                          : "border-border/60 bg-card hover:border-primary/20 hover:bg-accent/50",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {highlightText(item.name, debouncedQuery)}
                          </p>
                          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            {highlightText(item.addressString, debouncedQuery)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge
                            variant="outline"
                            className="border-primary/20 bg-primary/5 text-primary"
                          >
                            {resultTypeLabel}
                          </Badge>
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Star className="h-3.5 w-3.5 text-yellow-500" />
                            <span className="font-medium text-foreground">
                              {(item.rating ?? 0).toFixed(1)}
                            </span>
                            <span>({item.reviewCount})</span>
                          </span>
                        </div>
                      </div>

                      {/* {item.services.length > 0 ? (
                        <div className="mt-2">
                          <Badge
                            variant="outline"
                            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                          >
                            Service match:{" "}
                            <span className="ml-1 font-medium">
                              {highlightText(
                                item.matchedService,
                                debouncedQuery,
                              )}
                            </span>
                          </Badge>
                        </div>
                      ) : null} */}

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.services.map((service) => (
                          <Badge
                            key={service}
                            variant="outline"
                            className="bg-background"
                          >
                            {highlightText(service, debouncedQuery)}
                          </Badge>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
