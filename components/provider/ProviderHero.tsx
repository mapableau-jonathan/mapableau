import { MapPin, ShieldCheck, Star } from "lucide-react";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";

import type { ProviderWithRelations } from "./types";

type ProviderHeroProps = {
  provider: ProviderWithRelations;
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

/** Format ABN as XX XXX XXX XXX (Australian standard) */
function formatAbn(abn: string): string {
  const digits = abn.replace(/\D/g, "");
  if (digits.length !== 11) return abn;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 11)}`;
}

function formatLocation(provider: ProviderWithRelations): string | null {
  const loc = provider.locations[0];
  if (!loc) return null;
  const parts = [loc.address, loc.city, loc.state, loc.postcode].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join(", ") : null;
}

export default function ProviderHero({ provider }: ProviderHeroProps) {
  const location = formatLocation(provider);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:gap-6 items-center">
      {/* Logo */}
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/30 sm:h-24 sm:w-24">
        {provider.logoUrl ? (
          <Image
            src={provider.logoUrl}
            alt={`${provider.name} logo`}
            width={96}
            height={96}
            className="object-contain p-2"
          />
        ) : (
          <span className="text-2xl text-muted-foreground sm:text-3xl">
            {provider.name.charAt(0)}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <h1 className="text-2xl tracking-tight sm:text-3xl">{provider.name}</h1>

        {location && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            {location}
          </p>
        )}

        {(provider.rating != null || provider.reviewCount > 0) && (
          <div className="flex items-center gap-2 text-sm">
            {provider.rating != null && <StarRating rating={provider.rating} />}
            {provider.reviewCount > 0 && (
              <span className="text-muted-foreground">
                {provider.rating != null && `${provider.rating.toFixed(1)} · `}
                {provider.reviewCount} review
                {provider.reviewCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {provider.businessType && (
            <span className="text-sm text-muted-foreground">
              {provider.businessType}
            </span>
          )}
          {provider.abn && (
            <a
              href={`https://abr.business.gov.au/ABN/View?id=${provider.abn.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-foreground px-2.5 py-1 text-xs text-background hover:bg-foreground/90"
              title="View on ABN Lookup"
            >
              ABN {formatAbn(provider.abn)}
            </a>
          )}
          {provider.ndisRegistered && (
            <Badge
              variant="outline"
              className="border-primary/20 bg-primary/5 px-3 py-1 text-primary"
            >
              <ShieldCheck className="mr-1.5 h-4 w-4" />
              NDIS Registered
            </Badge>
          )}
          {provider.ndisNumber && (
            <Badge variant="outline" className="text-xs">
              {provider.ndisNumber}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
