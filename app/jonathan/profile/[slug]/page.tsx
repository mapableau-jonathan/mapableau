"use client";

import {
  ArrowLeft,
  Clock,
  Globe,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";

import { mapOutletsToProviders } from "@/app/provider-finder/outletToProvider";
import type { Provider } from "@/app/provider-finder/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useProviderOutlets } from "@/lib/use-provider-outlets";

function formatLocation(provider: Provider) {
  if (provider.suburb === "Remote") return "Telehealth (Australia-wide)";
  return `${provider.suburb} ${provider.state} ${provider.postcode}`;
}

function clampRating(rating: number) {
  if (Number.isNaN(rating)) return 0;
  return Math.max(0, Math.min(5, rating));
}

function ProviderProfile({
  provider,
  onClaim,
  isLoggedIn,
}: {
  provider: Provider;
  onClaim: () => void;
  isLoggedIn: boolean;
}) {
  const rating = clampRating(provider.rating);
  const showDistance =
    provider.distanceKm > 0 && provider.suburb !== "Remote";

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/provider-finder"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Provider Finder
        </Link>

        <Card variant="gradient" className="overflow-hidden">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-2xl sm:text-3xl">
                  {provider.name}
                </CardTitle>
                <CardDescription className="mt-2 flex flex-wrap items-center gap-2 text-base">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {formatLocation(provider)}
                  </span>
                  {showDistance && (
                    <span className="rounded-md bg-accent px-2 py-0.5 text-xs text-foreground">
                      {provider.distanceKm.toFixed(1)} km away
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {provider.registered ? (
                  <Badge
                    variant="outline"
                    className="border-primary/20 bg-primary/5 px-3 py-1.5 text-primary"
                  >
                    <ShieldCheck className="mr-1.5 h-4 w-4" />
                    Registered
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-border bg-background text-muted-foreground"
                  >
                    Unregistered
                  </Badge>
                )}
                {(provider.rating > 0 || provider.reviewCount > 0) && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    <span className="font-medium">
                      {rating.toFixed(1)}
                    </span>
                    <span className="text-muted-foreground">
                      ({provider.reviewCount} reviews)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {provider.categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {provider.categories.map((cat) => (
                  <Badge
                    key={cat}
                    variant="outline"
                    className="bg-background font-normal"
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
            )}

            {provider.supports.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Support modes:</span>
                {provider.supports.map((s) => (
                  <span
                    key={s}
                    className="rounded-md border border-border/70 bg-card px-2 py-1"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-6 border-t border-border/70 pt-6">
            {(provider.phone ||
              provider.email ||
              provider.website ||
              provider.abn) && (
              <section>
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  Contact &amp; business details
                </h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  {provider.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <a
                        href={`tel:${provider.phone.replace(/\s/g, "")}`}
                        className="text-primary hover:underline"
                      >
                        {provider.phone}
                      </a>
                    </div>
                  )}
                  {provider.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <a
                        href={`mailto:${provider.email}`}
                        className="break-all text-primary hover:underline"
                      >
                        {provider.email}
                      </a>
                    </div>
                  )}
                  {provider.website && (
                    <div className="flex items-start gap-3">
                      <Globe className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <a
                        href={
                          provider.website.startsWith("http")
                            ? provider.website
                            : `https://${provider.website}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-primary hover:underline"
                      >
                        {provider.website}
                      </a>
                    </div>
                  )}
                  {provider.abn && (
                    <div className="flex items-start gap-3">
                      <span className="font-medium text-foreground shrink-0">
                        ABN:
                      </span>
                      <span>{provider.abn}</span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {provider.openingHours && (
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Clock className="h-4 w-4" />
                  Opening hours
                </h3>
                <div className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm tabular-nums">
                  {provider.openingHours
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((segment) => {
                      const colonIdx = segment.indexOf(": ");
                      const day =
                        colonIdx >= 0 ? segment.slice(0, colonIdx) : segment;
                      const hours =
                        colonIdx >= 0 ? segment.slice(colonIdx + 2) : "";
                      return { day, hours };
                    })
                    .map(({ day, hours }) => (
                      <React.Fragment key={day}>
                        <span className="text-muted-foreground">
                          {day}
                        </span>
                        <span>{hours || "—"}</span>
                      </React.Fragment>
                    ))}
                </div>
              </section>
            )}
          </CardContent>

          <CardFooter className="flex flex-wrap gap-3 border-t border-border/70 pt-6">
            {isLoggedIn && provider.outletKey && (
              <Button
                variant="secondary"
                size="default"
                onClick={onClaim}
                className="w-full sm:w-auto"
              >
                Claim this profile
              </Button>
            )}
            {!isLoggedIn && provider.outletKey && (
              <Button asChild variant="secondary" size="default">
                <Link href="/login">Sign in to claim</Link>
              </Button>
            )}
            {provider.phone && (
              <Button asChild variant="default" size="default" className="flex-1">
                <a href={`tel:${provider.phone.replace(/\s/g, "")}`}>
                  Call
                </a>
              </Button>
            )}
            {provider.email && (
              <Button asChild variant="outline" size="default" className="flex-1">
                <a href={`mailto:${provider.email}`}>Email</a>
              </Button>
            )}
            {provider.website && (
              <Button asChild variant="outline" size="default" className="flex-1">
                <a
                  href={
                    provider.website.startsWith("http")
                      ? provider.website
                      : `https://${provider.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Website
                </a>
              </Button>
            )}
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}

export default function ProviderProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { status } = useSession();
  const slug = params.slug as string | undefined;
  const { data: outlets, isLoading, isError, error } = useProviderOutlets();
  const providers = outlets ? mapOutletsToProviders(outlets) : [];
  const [claimCheckDone, setClaimCheckDone] = useState(false);

  const provider = slug
    ? providers.find(
        (p) =>
          p.slug.toLowerCase() === slug.toLowerCase() ||
          p.id === slug
      )
    : null;

  useEffect(() => {
    if (!provider?.outletKey) {
      setClaimCheckDone(true);
      return;
    }
    let cancelled = false;
    fetch(`/api/profiles/claimed?outletKey=${encodeURIComponent(provider.outletKey)}`)
      .then((res) => res.json())
      .then((data: { claimed?: boolean; slug?: string }) => {
        if (cancelled) return;
        if (data.claimed && data.slug) {
          router.replace(`/profiles/${data.slug}`);
          return;
        }
        setClaimCheckDone(true);
      })
      .catch(() => setClaimCheckDone(true));
    return () => {
      cancelled = true;
    };
  }, [provider?.outletKey, router]);

  const handleClaim = async () => {
    if (!provider?.outletKey || status !== "authenticated") return;
    try {
      const res = await fetch("/api/profiles/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outletKey: provider.outletKey }),
      });
      const data = (await res.json()) as { success?: boolean; slug?: string };
      if (data.success && data.slug) {
        router.replace(`/profiles/${data.slug}`);
      }
    } catch {
      // silent
    }
  };

  if (isLoading || (provider?.outletKey && !claimCheckDone)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card variant="outlined" className="p-8 text-center max-w-md">
          <p className="text-muted-foreground">Loading providers…</p>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card variant="outlined" className="p-8 text-center max-w-md">
          <h2 className="text-lg font-semibold">Could not load providers</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Something went wrong."}
          </p>
          <Button asChild variant="outline" size="default" className="mt-4">
            <Link href="/provider-finder">Back to Provider Finder</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card variant="outlined" className="p-8 text-center max-w-md">
          <h2 className="text-lg font-semibold">Provider not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            No provider matches &quot;{slug}&quot;. Check the URL or browse from
            the Provider Finder.
          </p>
          <Button asChild variant="outline" size="default" className="mt-4">
            <Link href="/provider-finder">Back to Provider Finder</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <ProviderProfile
      provider={provider}
      onClaim={handleClaim}
      isLoggedIn={status === "authenticated"}
    />
  );
}
