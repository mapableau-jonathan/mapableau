import {
  Clock,
  Globe,
  Mail,
  MapPin,
  Phone,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDbTimeString } from "@/lib/dbTime";

import { ProviderOutlet } from "./types";

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

type ProviderOutletSidebarProps = {
  providerOutlet: ProviderOutlet;
};

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

export default function ProviderOutletSidebar({
  providerOutlet,
}: ProviderOutletSidebarProps) {
  const location = formatLocation(providerOutlet);
  const hasContact =
    providerOutlet.phone || providerOutlet.email || providerOutlet.website;

  return (
    <div className="space-y-6">
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
          {providerOutlet.phone && (
            <Button asChild variant="default" size="default" className="w-full">
              <a href={`tel:${providerOutlet.phone.replace(/\s/g, "")}`}>
                <Phone className="mr-2 h-4 w-4" />
                Call
              </a>
            </Button>
          )}
          {providerOutlet.email && (
            <Button asChild variant="outline" size="default" className="w-full">
              <a href={`mailto:${providerOutlet.email}`}>
                <Mail className="mr-2 h-4 w-4" />
                Email
              </a>
            </Button>
          )}
          {providerOutlet.website && (
            <Button asChild variant="outline" size="default" className="w-full">
              <a
                href={
                  providerOutlet.website.startsWith("http")
                    ? providerOutlet.website
                    : `https://${providerOutlet.website}`
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

      {providerOutlet.businessHours.length > 0 && (
        <Card variant="outlined">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Opening hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm tabular-nums">
              {providerOutlet.businessHours.map((bh) => (
                <span key={bh.id} className="contents">
                  <span className="text-muted-foreground">
                    {DAY_LABELS[bh.dayOfWeek] ?? bh.dayOfWeek}
                  </span>
                  <span>
                    {getDbTimeString(bh.openTime)} –{" "}
                    {getDbTimeString(bh.closeTime)}
                  </span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {providerOutlet.serviceAreas.length > 0 && (
        <Card variant="outlined">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4" />
              Service Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {providerOutlet.serviceAreas.map((area, i) => (
                <li key={i}>{area}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {providerOutlet.specialisations.length > 0 && (
        <Card variant="outlined">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" />
              Specialisations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {providerOutlet.specialisations.map((spec, i) => (
                <li key={i}>{spec.name}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {providerOutlet.ndisNumber && (
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">
            {providerOutlet.ndisNumber}
          </Badge>
        </div>
      )}

      <Link
        href="/provider-finder"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Back to Provider Finder
      </Link>
    </div>
  );
}
