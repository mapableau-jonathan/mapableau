import {
  Clock,
  Globe,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
} from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";

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
import { getDbTimeString } from "@/lib/dbTime";

import { Address, ProviderOutlet } from "../providers";
import { ViewMode } from "../types";
import { clampRating, formatLocation } from "../utils";

export function ProviderOutletCard({
  providerOutlet,
  address,
  distanceKm,
  view,
  onSelect,
  isSelected,
}: {
  providerOutlet: ProviderOutlet;
  address: Address;
  distanceKm: number;
  view: ViewMode;
  onSelect?: (providerOutlet: ProviderOutlet) => void;
  isSelected?: boolean;
}) {
  const rating = clampRating(providerOutlet.rating ?? 0);

  return (
    <Card
      variant={view === "grid" ? "interactive" : "outlined"}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect ? () => onSelect(providerOutlet) : undefined}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(providerOutlet);
              }
            }
          : undefined
      }
      className={cn(
        "flex h-full flex-col",
        onSelect && "cursor-pointer",
        isSelected &&
          "shadow-lg shadow-primary/10 -translate-y-1 border-primary/20 ring-2 ring-primary/20 ring-offset-2 ring-offset-background",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex w-full min-w-0 flex-col gap-3">
          <div className="min-w-0 w-full">
            <CardTitle className="text-base sm:text-lg break-words">
              {providerOutlet.name}
            </CardTitle>
            {providerOutlet.provider.name.trim().toLowerCase() !==
            providerOutlet.name.trim().toLowerCase() ? (
              <p className="mt-0.5 text-xs text-muted-foreground break-words">
                Provider - {providerOutlet.provider.name}
              </p>
            ) : null}
            <div className="mt-1 flex flex-col gap-1 text-sm text-muted-foreground">
              <span className="inline-flex min-w-0 items-start gap-1.5">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="min-w-0 break-words">
                  {formatLocation(address)}
                </span>
              </span>
              <span className="w-fit rounded-md bg-accent px-2 py-0.5 text-xs text-foreground">
                {distanceKm.toFixed(1)} km away
              </span>
            </div>
          </div>

          <div className="flex min-w-0 w-full flex-wrap items-center gap-x-3 gap-y-2">
            <Badge variant="secondary" className="w-fit font-normal">
              Outlet
            </Badge>
            {providerOutlet.provider.ndisRegistered ? (
              <Badge
                variant="outline"
                className="w-fit border-primary/20 bg-primary/5 text-primary"
              >
                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                Registered
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="w-fit border-border bg-background text-muted-foreground"
              >
                Unregistered
              </Badge>
            )}

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-4 w-4 shrink-0 text-yellow-500 fill-yellow-500" />
              <span className="font-medium text-foreground">
                {rating.toFixed(1)}
              </span>
              <span>({providerOutlet.reviewCount})</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 space-y-3">
        <div className="flex flex-wrap gap-2">
          {providerOutlet.services.map((s) => (
            <Badge
              key={s.serviceDefinition.id}
              variant="outline"
              className="bg-background"
            >
              {s.serviceDefinition.name}
            </Badge>
          ))}
        </div>

        {providerOutlet.serviceAreas.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <span className="font-medium text-foreground">
                Service areas:
              </span>
              {providerOutlet.serviceAreas.map((s) => (
                <span
                  key={s}
                  className="rounded-md border border-border/70 bg-card px-2 py-0.5"
                >
                  {s}
                </span>
              ))}
            </span>
          </div>
        ) : null}
        {providerOutlet.phone ||
        providerOutlet.email ||
        providerOutlet.website ||
        providerOutlet.abn ||
        providerOutlet.businessHours.length > 0 ? (
          <div className="space-y-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
            {providerOutlet.phone ? (
              <div className="flex items-start gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <a
                  href={`tel:${providerOutlet.phone.replace(/\s/g, "")}`}
                  className="text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {providerOutlet.phone}
                </a>
              </div>
            ) : null}
            {providerOutlet.email ? (
              <div className="flex items-start gap-2">
                <Mail className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <a
                  href={`mailto:${providerOutlet.email}`}
                  className="text-primary hover:underline break-all"
                  onClick={(e) => e.stopPropagation()}
                >
                  {providerOutlet.email}
                </a>
              </div>
            ) : null}
            {providerOutlet.website ? (
              <div className="flex items-start gap-2">
                <Globe className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <a
                  href={
                    providerOutlet.website.startsWith("http")
                      ? providerOutlet.website
                      : `https://${providerOutlet.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline break-all"
                  onClick={(e) => e.stopPropagation()}
                >
                  {providerOutlet.website}
                </a>
              </div>
            ) : null}
            {providerOutlet.abn ? (
              <div className="flex items-start gap-2">
                <span className="font-medium text-foreground shrink-0">
                  ABN:
                </span>
                <span>{providerOutlet.abn}</span>
              </div>
            ) : null}
            {providerOutlet.businessHours.length > 0 ? (
              <div className="flex items-start gap-2">
                <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <div className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5 text-sm font-medium tabular-nums">
                  {providerOutlet.businessHours.map((bh) => {
                    return (
                      <Fragment key={bh.id}>
                        <span className="text-muted-foreground">
                          {bh.dayOfWeek}
                        </span>
                        <span>
                          {getDbTimeString(bh.openTime)} -{" "}
                          {getDbTimeString(bh.closeTime)}
                        </span>
                      </Fragment>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>

      <CardFooter
        className="flex flex-col gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <Button asChild variant="outline" size="default" className="w-full">
          <Link
            href={`/provider/${encodeURIComponent(providerOutlet.provider.id)}`}
          >
            View Provider
          </Link>
        </Button>
        <div className="flex w-full gap-2">
          <Button asChild variant="outline" size="default" className="flex-1">
            <Link
              href={`/provider-outlet/${encodeURIComponent(providerOutlet.id)}`}
            >
              View profile
            </Link>
          </Button>
          <Button variant="default" size="default" className="flex-1">
            Contact
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
