"use client";

import { MapPin, Search, SlidersHorizontal } from "lucide-react";
import { type RefObject } from "react";

import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { AutocompleteSuggestion } from "./types";

const SUGGESTION_PLACEHOLDER = "Provider name or service (e.g. therapy, transport)";

type SearchBarProps = {
  /** Main search input (hero) */
  id: string;
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  /** Autocomplete */
  suggestions: AutocompleteSuggestion[];
  showSuggestions: boolean;
  selectedIndex: number;
  onSuggestionSelect: (index: number) => void;
  onSuggestionHover: (index: number) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  dropdownRef?: RefObject<HTMLDivElement | null>;
  /** Card variant for hero vs inline */
  variant?: "hero" | "inline";
  label?: string;
};

export function SearchBar({
  id,
  value,
  onChange,
  onFocus,
  placeholder = SUGGESTION_PLACEHOLDER,
  suggestions,
  showSuggestions,
  selectedIndex,
  onSuggestionSelect,
  onSuggestionHover,
  inputRef,
  dropdownRef,
  variant = "hero",
  label = "Search",
}: SearchBarProps) {
  const showDropdown = showSuggestions && suggestions.length > 0;

  const content = (
    <div className="w-full">
      <label
            id={`${id}-label`}
            htmlFor={id}
            className="text-xs font-medium text-muted-foreground"
          >
            {label}
          </label>
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              ref={inputRef}
              id={id}
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={onFocus}
              placeholder={placeholder}
              className="w-full rounded-lg border border-input bg-background px-9 py-2.5 text-sm shadow-sm outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-ring"
              autoComplete="off"
              aria-autocomplete="list"
              aria-controls={showDropdown ? `${id}-listbox` : undefined}
              aria-activedescendant={
                showDropdown && selectedIndex >= 0
                  ? `${id}-option-${selectedIndex}`
                  : undefined
              }
              aria-labelledby={`${id}-label`}
              title="Search providers and services"
              {...(showDropdown ? { "aria-expanded": "true" as const } : { "aria-expanded": "false" as const })}
            />
            {showDropdown && (
              <div
                ref={dropdownRef}
                id={`${id}-listbox`}
                role="listbox"
                className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-background shadow-lg"
              >
                <div className="max-h-64 overflow-y-auto p-1">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion.type}-${suggestion.value}-${index}`}
                      id={`${id}-option-${index}`}
                      role="option"
                      type="button"
                      {...(index === selectedIndex ? { "aria-selected": "true" as const } : { "aria-selected": "false" as const })}
                      onClick={() => onSuggestionSelect(index)}
                      onMouseEnter={() => onSuggestionHover(index)}
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
                        <span className="font-medium">{suggestion.label}</span>
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
  );

  if (variant === "inline") {
    return content;
  }

  return (
    <Card variant="gradient">
      <CardHeader className="pb-4">{content}</CardHeader>
    </Card>
  );
}
