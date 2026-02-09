"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { scoreRelevance } from "@/components/provider-finder";
import type { AutocompleteSuggestion, SortMode, ViewMode } from "@/components/provider-finder";
import {
  distanceKm,
  getLocationAndPostcode,
  type UserPosition,
} from "@/lib/geo";
import { buildPath } from "@/lib/router";
import { useProviderOutlets } from "@/lib/use-provider-outlets";


import { mapOutletsToProviders } from "./outletToProvider";

const RADIUS_KM = 50;
const MAP_PIN_LIMIT = 500;
const PAGE_SIZE = 9;

export function useProviderFinder() {
  const router = useRouter();
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
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const visible = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredSorted.slice(start, start + PAGE_SIZE);
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
    return list.slice(0, MAP_PIN_LIMIT);
  }, [filteredSorted, userLocation]);

  useEffect(() => {
    if (page !== currentPage) setPage(currentPage);
  }, [currentPage, page]);

  const autocompleteSuggestions = useMemo((): AutocompleteSuggestion[] => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];

    const suggestions: AutocompleteSuggestion[] = [];

    providers
      .filter((p) => p.name.toLowerCase().includes(q))
      .forEach((provider) => {
        suggestions.push({
          type: "provider",
          label: provider.name,
          value: provider.name,
          action: () => {
            setShowAutocomplete(false);
            router.push(buildPath("outletProfile", { slug: provider.slug }));
          },
        });
      });

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

    const supportTypes = ["Telehealth", "In-person"] as const;
    supportTypes.forEach((support) => {
      if (support.toLowerCase().includes(q)) {
        suggestions.push({
          type: "category",
          label: support,
          value: support,
          action: () => {
            setTelehealthOnly(support === "Telehealth");
            setQuery("");
            setShowAutocomplete(false);
            setPage(1);
          },
        });
      }
    });

    return suggestions.slice(0, 8);
  }, [providerCategories, providers, query, router]);

  useEffect(() => {
    if (
      autocompleteSuggestions.length > 0 &&
      selectedIndex >= autocompleteSuggestions.length
    ) {
      setSelectedIndex(autocompleteSuggestions.length - 1);
    }
  }, [autocompleteSuggestions.length, selectedIndex]);

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
        autocompleteSuggestions[selectedIndex].action?.();
      } else if (e.key === "Escape") {
        setShowAutocomplete(false);
        setSelectedIndex(-1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAutocomplete, autocompleteSuggestions, selectedIndex]);

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
    !!query.trim() ||
    !!location.trim() ||
    category !== "all" ||
    registeredOnly ||
    telehealthOnly ||
    sort !== "relevance";

  const handleSuggestionSelect = (index: number) => {
    autocompleteSuggestions[index]?.action?.();
  };

  const handleSearchChange = (value: string) => {
    setQuery(value);
    setShowAutocomplete(true);
    setSelectedIndex(-1);
    setPage(1);
  };

  const handleSearchFocus = () => {
    if (
      query.trim().length >= 2 &&
      autocompleteSuggestions.length > 0
    ) {
      setShowAutocomplete(true);
    }
  };

  return {
    // Data
    providers,
    providerCategories,
    isLoading,
    isError,
    error,
    // Filtered / paginated
    filteredSorted,
    visible,
    total,
    totalPages,
    currentPage,
    pageSize: PAGE_SIZE,
    mapProviders,
    MAP_PIN_LIMIT,
    RADIUS_KM,
    // State
    query,
    setQuery,
    location,
    setLocation,
    category,
    setCategory,
    registeredOnly,
    setRegisteredOnly,
    telehealthOnly,
    setTelehealthOnly,
    view,
    setView,
    sort,
    setSort,
    page,
    setPage,
    filtersExpanded,
    setFiltersExpanded,
    showAutocomplete,
    setShowAutocomplete,
    selectedIndex,
    setSelectedIndex,
    userLocation,
    locationLoading,
    locationError,
    // Refs
    searchInputRef,
    autocompleteRef,
    // Autocomplete
    autocompleteSuggestions,
    handleSuggestionSelect,
    handleSearchChange,
    handleSearchFocus,
    onSuggestionHover: setSelectedIndex,
    // Actions
    useMyLocation,
    clearFilters,
    hasActiveFilters,
    router,
  };
}
