"use client";

import { MapPin } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPlace, PLACE_LABEL } from "@/lib/place";
import { buildPath } from "@/lib/router";

import type { ParticipantProfilePublic } from "./types";

export function ParticipantProfileView({ profile }: { profile: ParticipantProfilePublic }) {
  const place = formatPlace(profile);

  return (
    <Card variant="gradient" className="overflow-hidden">
      <CardHeader className="space-y-4">
        <div>
          <CardTitle className="text-2xl sm:text-3xl">
            {profile.displayName || "Participant profile"}
          </CardTitle>
          {place && (
            <CardDescription className="mt-2 flex items-center gap-1.5 text-base" aria-label={PLACE_LABEL}>
              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
              {place}
            </CardDescription>
          )}
        </div>
        {profile.preferredCategories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-muted-foreground">Support categories:</span>
            {profile.preferredCategories.map((cat) => (
              <Badge key={cat} variant="outline" className="bg-background font-normal">
                {cat}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6 border-t border-border/70 pt-6">
        {profile.accessibilityNeeds && (
          <section>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Accessibility needs</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {profile.accessibilityNeeds}
            </p>
          </section>
        )}
        {profile.savedProviders && profile.savedProviders.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Saved providers</h3>
            <ul className="space-y-2">
              {profile.savedProviders.map((p) => (
                <li key={p.id}>
                  <Link
                    href={buildPath("claimedProfile", { slug: p.slug })}
                    className="text-primary hover:underline text-sm"
                  >
                    {p.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
