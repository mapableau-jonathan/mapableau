"use client";

import { FlaskConical, User, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import {
  useParticipantConsumer,
  type SyntheticParticipant,
} from "@/app/contexts/ParticipantConsumerContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buildPath } from "@/lib/router";

export default function JonathanEmulatePage() {
  const router = useRouter();
  const {
    participant,
    isEmulated,
    setEmulationBySlug,
    setEmulationSynthetic,
    clearEmulation,
  } = useParticipantConsumer();

  const [slugInput, setSlugInput] = useState("");
  const [synthetic, setSynthetic] = useState<SyntheticParticipant>({
    displayName: "",
    suburb: "",
    state: "",
    postcode: "",
    preferredCategories: [],
    accessibilityNeeds: "",
  });
  const [categoriesInput, setCategoriesInput] = useState("");

  const handleUseRealProfile = useCallback(() => {
    clearEmulation();
    router.push(buildPath("providerFinder", {}));
  }, [clearEmulation, router]);

  const handleStartBySlug = useCallback(() => {
    const slug = slugInput.trim();
    if (!slug) return;
    setEmulationBySlug(slug);
    router.push(buildPath("providerFinder", {}));
  }, [slugInput, setEmulationBySlug, router]);

  const handleStartSynthetic = useCallback(() => {
    const preferredCategories = categoriesInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setEmulationSynthetic({
      ...synthetic,
      preferredCategories: preferredCategories.length ? preferredCategories : undefined,
    });
    router.push(buildPath("providerFinder", {}));
  }, [synthetic, categoriesInput, setEmulationSynthetic, router]);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Participant consumer emulation
        </h1>
        <p className="mt-2 text-muted-foreground">
          Simulate a participant when using the Provider Finder. Useful for demos, testing, or support.
        </p>
      </header>

      {isEmulated && participant && (
        <Card variant="outlined" className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FlaskConical className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden />
              Current emulation
            </CardTitle>
            <CardDescription>
              {participant.displayName || participant.slug || "Synthetic profile"} — location and preferences will pre-fill the Provider Finder.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="default" onClick={handleUseRealProfile}>
              Use my real profile
            </Button>
          </CardContent>
        </Card>
      )}

      <Card variant="outlined">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            Emulate by participant slug
          </CardTitle>
          <CardDescription>
            Enter the slug of an existing public participant profile to see the finder as they would.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="text"
            value={slugInput}
            onChange={(e) => setSlugInput(e.target.value)}
            placeholder="e.g. jane-doe"
            aria-label="Participant slug"
          />
          <Button
            variant="secondary"
            onClick={handleStartBySlug}
            disabled={!slugInput.trim()}
          >
            Start emulation
          </Button>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            Emulate with synthetic data
          </CardTitle>
          <CardDescription>
            Pre-fill the Provider Finder with custom location and preferences without an existing profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <label htmlFor="emulate-displayName" className="space-y-1.5 text-sm">
              <span className="font-medium text-foreground">Display name (optional)</span>
              <Input
                id="emulate-displayName"
                type="text"
                value={synthetic.displayName ?? ""}
                onChange={(e) =>
                  setSynthetic((s) => ({ ...s, displayName: e.target.value || undefined }))
                }
                aria-label="Display name"
              />
            </label>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <label htmlFor="emulate-suburb" className="space-y-1.5 text-sm">
              <span className="font-medium text-foreground">Suburb</span>
              <Input
                id="emulate-suburb"
                type="text"
                value={synthetic.suburb ?? ""}
                onChange={(e) =>
                  setSynthetic((s) => ({ ...s, suburb: e.target.value || undefined }))
                }
                aria-label="Suburb"
              />
            </label>
            <label htmlFor="emulate-state" className="space-y-1.5 text-sm">
              <span className="font-medium text-foreground">State</span>
              <Input
                id="emulate-state"
                type="text"
                value={synthetic.state ?? ""}
                onChange={(e) =>
                  setSynthetic((s) => ({ ...s, state: e.target.value || undefined }))
                }
                aria-label="State"
              />
            </label>
            <label htmlFor="emulate-postcode" className="space-y-1.5 text-sm">
              <span className="font-medium text-foreground">Postcode</span>
              <Input
                id="emulate-postcode"
                type="text"
                value={synthetic.postcode ?? ""}
                onChange={(e) =>
                  setSynthetic((s) => ({ ...s, postcode: e.target.value || undefined }))
                }
                aria-label="Postcode"
              />
            </label>
          </div>
          <label htmlFor="emulate-categories" className="block space-y-1.5 text-sm">
            <span className="font-medium text-foreground">Preferred categories (comma-separated)</span>
            <Input
              id="emulate-categories"
              type="text"
              value={categoriesInput}
              onChange={(e) => setCategoriesInput(e.target.value)}
              placeholder="e.g. Support coordination, Plan management"
              aria-label="Preferred categories"
            />
          </label>
          <label htmlFor="emulate-accessibilityNeeds" className="block space-y-1.5 text-sm">
            <span className="font-medium text-foreground">Accessibility needs (optional)</span>
            <Input
              id="emulate-accessibilityNeeds"
              type="text"
              value={synthetic.accessibilityNeeds ?? ""}
              onChange={(e) =>
                setSynthetic((s) => ({ ...s, accessibilityNeeds: e.target.value || undefined }))
              }
              aria-label="Accessibility needs"
            />
          </label>
          <Button variant="secondary" onClick={handleStartSynthetic}>
            Start synthetic emulation
          </Button>
        </CardContent>
      </Card>

      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <Link href={buildPath("jonathan", {})} className="underline hover:text-foreground">
          Back to Jonathan
        </Link>
        <Link href={buildPath("providerFinder", {})} className="underline hover:text-foreground">
          Go to Provider Finder
        </Link>
      </p>
    </div>
  );
}
