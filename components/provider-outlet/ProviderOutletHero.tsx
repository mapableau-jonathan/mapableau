import { MapPin, Star } from "lucide-react";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";

import type { ProviderOutlet } from "./types";

type ProviderOutletHeroProps = {
  providerOutlet: ProviderOutlet;
};

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${rating.toFixed(1)} out of 5 stars`}
    >
      {Array.from({ length: full }, (_, i) => (
        <Star
          key={`full-${i}`}
          className="h-4 w-4 fill-amber-400 text-amber-400"
        />
      ))}
      {half && <Star className="h-4 w-4 fill-amber-400/60 text-amber-400" />}
      {Array.from({ length: empty }, (_, i) => (
        <Star key={`empty-${i}`} className="h-4 w-4 text-amber-400/30" />
      ))}
    </span>
  );
}

function formatAbn(abn: string): string {
  const digits = abn.replace(/\D/g, "");
  if (digits.length !== 11) return abn;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 11)}`;
}

function formatLocation(providerOutlet: ProviderOutlet): string | null {
  const loc = providerOutlet.address ?? null;
  if (!loc) return null;
  if (!loc.street || !loc.suburb) return loc.addressString;
  const parts = [
    loc.street,
    loc.suburb,
    loc.city,
    loc.state,
    loc.postcode,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

export default function ProviderOutletHero({
  providerOutlet,
}: ProviderOutletHeroProps) {
  const location = formatLocation(providerOutlet);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:gap-6 items-center">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/30 sm:h-24 sm:w-24">
        {providerOutlet.logoUrl ? (
          <Image
            src={providerOutlet.logoUrl}
            alt={`${providerOutlet.name} logo`}
            width={96}
            height={96}
            className="object-contain p-2"
          />
        ) : (
          <span className="text-2xl text-muted-foreground sm:text-3xl">
            {providerOutlet.name.charAt(0)}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <h1 className="text-2xl tracking-tight sm:text-3xl">
          {providerOutlet.name}
        </h1>

        {location && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            {location}
          </p>
        )}

        {(providerOutlet.rating != null || providerOutlet.reviewCount > 0) && (
          <div className="flex items-center gap-2 text-sm">
            {providerOutlet.rating != null && (
              <StarRating rating={providerOutlet.rating} />
            )}
            {providerOutlet.reviewCount > 0 && (
              <span className="text-muted-foreground">
                {providerOutlet.rating != null &&
                  `${providerOutlet.rating.toFixed(1)} · `}
                {providerOutlet.reviewCount} review
                {providerOutlet.reviewCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {providerOutlet.businessType && (
            <span className="text-sm text-muted-foreground">
              {providerOutlet.businessType}
            </span>
          )}
          {providerOutlet.abn && (
            <a
              href={`https://abr.business.gov.au/ABN/View?id=${providerOutlet.abn.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-foreground px-2.5 py-1 text-xs text-background hover:bg-foreground/90"
              title="View on ABN Lookup"
            >
              ABN {formatAbn(providerOutlet.abn)}
            </a>
          )}
          {providerOutlet.ndisNumber && (
            <Badge variant="outline" className="text-xs">
              {providerOutlet.ndisNumber}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
