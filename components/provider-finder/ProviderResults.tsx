"use client";

import type { Provider } from "@/app/provider-finder/providers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { ProviderCard } from "./ProviderCard";
import type { ViewMode } from "./types";

type ProviderResultsProps = {
  providers: Provider[];
  view: ViewMode;
  onProviderSelect: (provider: Provider) => void;
  emptyMessage?: string;
  onClearFilters?: () => void;
};

export function ProviderResults({
  providers,
  view,
  onProviderSelect,
  emptyMessage = "No providers found",
  onClearFilters,
}: ProviderResultsProps) {
  if (providers.length === 0) {
    return (
      <Card variant="outlined" className="p-8 text-center">
        <div className="mx-auto max-w-md">
          <h2 className="text-lg font-semibold">{emptyMessage}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Try removing a filter or searching a broader term.
          </p>
          {onClearFilters ? (
            <div className="mt-5 flex justify-center">
              <Button
                variant="outline"
                size="default"
                onClick={onClearFilters}
                type="button"
              >
                Clear filters
              </Button>
            </div>
          ) : null}
        </div>
      </Card>
    );
  }

  return (
    <div
      className={cn(
        view === "grid"
          ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          : "flex flex-col gap-4",
      )}
    >
      {providers.map((p) => (
        <ProviderCard
          key={p.id}
          provider={p}
          view={view}
          onSelect={onProviderSelect}
          isSelected={false}
        />
      ))}
    </div>
  );
}
