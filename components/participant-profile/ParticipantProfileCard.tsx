"use client";

import { MapPin } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPlace, PLACE_LABEL } from "@/lib/place";

import type { ParticipantProfileData } from "./types";

export function ParticipantProfileCard({ profile }: { profile: ParticipantProfileData }) {
  const place = formatPlace(profile);
  const publicUrl =
    profile.visibility === "public" && profile.slug
      ? `/jonathan/participant/${encodeURIComponent(profile.slug)}`
      : null;

  return (
    <Card variant="outlined" className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">
              {profile.displayName || "Participant profile"}
            </CardTitle>
            {place && (
              <CardDescription className="mt-1 flex items-center gap-1.5 text-sm" aria-label={PLACE_LABEL}>
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {place}
              </CardDescription>
            )}
          </div>
          {profile.visibility === "public" ? (
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
              Public
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Private
            </Badge>
          )}
        </div>
        {profile.preferredCategories.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profile.preferredCategories.slice(0, 4).map((cat) => (
              <Badge key={cat} variant="outline" className="text-xs font-normal">
                {cat}
              </Badge>
            ))}
            {profile.preferredCategories.length > 4 && (
              <span className="text-xs text-muted-foreground">
                +{profile.preferredCategories.length - 4} more
              </span>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button asChild variant="default" size="default">
          <Link href="/jonathan/participant">Edit profile</Link>
        </Button>
        {publicUrl && (
          <Button asChild variant="outline" size="default">
            <Link href={publicUrl}>View public profile</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
