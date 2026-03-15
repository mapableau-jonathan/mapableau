import {
  Clock,
  Globe,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { ProviderWithRelations } from "./types";

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

type ProviderSidebarProps = {
  provider: ProviderWithRelations;
};

function formatLocation(provider: ProviderWithRelations): string | null {
  const loc = provider.locations[0];
  if (!loc) return null;
  const parts = [loc.address, loc.city, loc.state, loc.postcode].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join(", ") : null;
}

export default function ProviderSidebar({ provider }: ProviderSidebarProps) {
  const location = formatLocation(provider);
  const hasContact = provider.phone || provider.email || provider.website;

  return (
    <div className="space-y-6">
      {/* Contact card */}
      <Card variant="outlined">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {location && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{location}</span>
            </div>
          )}
          {provider.phone && (
            <Button asChild variant="default" size="default" className="w-full">
              <a href={`tel:${provider.phone.replace(/\s/g, "")}`}>
                <Phone className="mr-2 h-4 w-4" />
                Call
              </a>
            </Button>
          )}
          {provider.email && (
            <Button asChild variant="outline" size="default" className="w-full">
              <a href={`mailto:${provider.email}`}>
                <Mail className="mr-2 h-4 w-4" />
                Email
              </a>
            </Button>
          )}
          {provider.website && (
            <Button asChild variant="outline" size="default" className="w-full">
              <a
                href={
                  provider.website.startsWith("http")
                    ? provider.website
                    : `https://${provider.website}`
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                <Globe className="mr-2 h-4 w-4" />
                Website
              </a>
            </Button>
          )}
          {!hasContact && !location && (
            <p className="text-sm text-muted-foreground">
              No contact details available
            </p>
          )}
        </CardContent>
      </Card>

      {/* Business hours */}
      {provider.businessHours.length > 0 && (
        <Card variant="outlined">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Opening hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm tabular-nums">
              {provider.businessHours.map((bh) => (
                <span key={bh.id} className="contents">
                  <span className="text-muted-foreground">
                    {DAY_LABELS[bh.dayOfWeek] ?? bh.dayOfWeek}
                  </span>
                  <span>
                    {bh.openTime} – {bh.closeTime}
                  </span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service Areas */}
      {provider.serviceAreas.length > 0 && (
        <Card variant="outlined">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4" />
              Service Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {provider.serviceAreas.map((area, i) => (
                <li key={i}>{area}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Specialisations */}
      {provider.specialisations.length > 0 && (
        <Card variant="outlined">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" />
              Specialisations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {provider.specialisations.map((spec, i) => (
                <li key={i}>{spec}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
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

      {/* Back link */}
      <Link
        href="/provider-finder"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Back to Provider Finder
      </Link>
    </div>
  );
}
