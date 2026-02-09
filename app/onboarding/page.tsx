"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

import { PROVIDER_CATEGORIES } from "@/app/provider-finder/providers";
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
import type { AbrLookupSuccess } from "@/lib/abr";
import { buildPath } from "@/lib/router";
import { parseResponseJson } from "@/lib/utils";

const STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"] as const;

type OnboardingData = {
  claimedProviderId: string;
  slug: string;
  step: string;
  name: string | null;
  abn: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  openingHours: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  categories: string[];
};

const STEP_ORDER = [
  "business",
  "contact",
  "categories",
  "hours",
  "confirm",
];

export default function OnboardingPage() {
  const { status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [abnLookupLoading, setAbnLookupLoading] = useState(false);
  const [abnLookupError, setAbnLookupError] = useState<string | null>(null);
  const [abnLookupResult, setAbnLookupResult] = useState<AbrLookupSuccess | null>(null);
  const step = STEP_ORDER[stepIndex];

  const fetchOnboarding = useCallback(async () => {
    const res = await fetch("/api/onboarding");
    if (!res.ok) return;
    const json = await parseResponseJson<{ onboarding: OnboardingData | null }>(res);
    if (json?.onboarding) setData(json.onboarding);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(
        `${buildPath("login", {})}?callbackUrl=${encodeURIComponent("/onboarding")}`,
      );
      return;
    }
    if (status === "authenticated") fetchOnboarding().finally(() => setLoading(false));
  }, [status, router, fetchOnboarding]);

  useEffect(() => {
    if (!data) return;
    if (data.step === "done") {
      router.replace(buildPath("claimedProfile", { slug: data.slug }));
      return;
    }
    const nameDone = !!data.name?.trim();
    const contactDone = !!(data.email?.trim() || data.phone?.trim());
    const categoriesDone = data.categories.length > 0;
    if (!nameDone) setStepIndex(0);
    else if (!contactDone) setStepIndex(1);
    else if (!categoriesDone) setStepIndex(2);
    else if (stepIndex < 3) setStepIndex(3);
    else if (stepIndex < 4) setStepIndex(4);
  }, [data, router, stepIndex]);

  const patch = useCallback(
    async (payload: Record<string, unknown>) => {
      const slug = data?.slug;
      setSaving(true);
      try {
        const res = await fetch("/api/onboarding", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updated = await parseResponseJson<{ onboardingStatus?: string }>(res);
          if (updated?.onboardingStatus === "completed" && slug) {
            router.replace(buildPath("claimedProfile", { slug }));
            return;
          }
          await fetchOnboarding();
        }
      } finally {
        setSaving(false);
      }
    },
    [data?.slug, router, fetchOnboarding],
  );

  const handleAbnLookup = useCallback(async () => {
    const abnInput = document.querySelector<HTMLInputElement>('[name="abn"]');
    const abn = abnInput?.value?.trim();
    if (!abn) {
      setAbnLookupError("Enter an ABN to look up.");
      return;
    }
    setAbnLookupError(null);
    setAbnLookupLoading(true);
    try {
      const res = await fetch(
        `/api/abr/lookup?abn=${encodeURIComponent(abn)}`,
      );
      const result = await parseResponseJson<
        AbrLookupSuccess | { success: false; message: string }
      >(res);
      if (result?.success) {
        setAbnLookupResult(result);
        await patch({
          name: result.entityName ?? data?.name ?? null,
          abn: result.abn,
          abnVerified: true,
          ...(result.state && { state: result.state }),
          ...(result.postcode && { postcode: result.postcode }),
        });
        await fetchOnboarding();
      } else {
        setAbnLookupResult(null);
        setAbnLookupError(result?.message ?? "Lookup failed.");
      }
    } catch {
      setAbnLookupResult(null);
      setAbnLookupError("Lookup failed. Try again.");
    } finally {
      setAbnLookupLoading(false);
    }
  }, [data?.name, fetchOnboarding, patch]);

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (status === "authenticated" && !data) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-10">
        <Card variant="outlined">
          <CardHeader>
            <CardTitle>No onboarding in progress</CardTitle>
            <CardDescription>
              Register as a provider or claim your listing from the Provider
              Finder to get started.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild variant="default" size="default">
              <Link href={buildPath("providerFinder", {})}>
                Go to Provider Finder
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const onboarding: OnboardingData = data;

  return (
    <div className="container mx-auto max-w-lg px-4 py-10">
      <nav aria-label="Progress" className="mb-8">
        <ol className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          {STEP_ORDER.map((s, i) => (
            <li
              key={s}
              aria-current={stepIndex === i ? "step" : undefined}
              className={stepIndex === i ? "font-medium text-foreground" : ""}
            >
              {i > 0 && " → "}
              {s === "business" && "Business"}
              {s === "contact" && "Contact"}
              {s === "categories" && "Categories"}
              {s === "hours" && "Hours"}
              {s === "confirm" && "Confirm"}
            </li>
          ))}
        </ol>
      </nav>

      {step === "business" && (
        <Card variant="outlined">
          <CardHeader>
            <CardTitle>Business name and ABN</CardTitle>
            <CardDescription>
              Enter your practice or business name and optional ABN. Use Look up
              to verify an ABN and pre-fill from the Australian Business
              Register.
            </CardDescription>
          </CardHeader>
          <form
            key={`business-${onboarding.name ?? ""}-${onboarding.abn ?? ""}`}
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const name = (form.querySelector('[name="name"]') as HTMLInputElement)
                ?.value?.trim();
              const abn = (form.querySelector('[name="abn"]') as HTMLInputElement)
                ?.value?.trim() || null;
              if (name) {
                const payload: Record<string, unknown> = { name, abn };
                if (abnLookupResult && abn === abnLookupResult.abn) {
                  payload.abnVerified = true;
                }
                patch(payload).then(() => setStepIndex(1));
              }
            }}
          >
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="onboarding-name" className="text-sm font-medium">
                  Business name
                </label>
                <input
                  id="onboarding-name"
                  name="name"
                  type="text"
                  defaultValue={onboarding.name ?? ""}
                  placeholder="e.g. Acme Support Services"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  required
                  disabled={saving}
                />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="onboarding-abn"
                    className="text-sm font-medium"
                  >
                    ABN (optional)
                  </label>
                  {abnLookupResult && (
                    <Badge
                      variant="secondary"
                      className="text-xs font-normal"
                      aria-live="polite"
                    >
                      Verified
                    </Badge>
                  )}
                </div>
                <div className="mt-1 flex gap-2">
                  <input
                    id="onboarding-abn"
                    name="abn"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9\s]{9,11}"
                    defaultValue={onboarding.abn ?? ""}
                    placeholder="e.g. 12 345 678 901"
                    className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    disabled={saving}
                    aria-describedby="onboarding-abn-hint"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    disabled={saving || abnLookupLoading}
                    onClick={handleAbnLookup}
                    aria-label="Look up ABN in Australian Business Register"
                  >
                    {abnLookupLoading ? "Looking up…" : "Look up"}
                  </Button>
                </div>
                {abnLookupError && (
                  <p
                    className="mt-1 text-sm text-destructive"
                    role="alert"
                    id="onboarding-abn-error"
                  >
                    {abnLookupError}
                  </p>
                )}
                <p
                  id="onboarding-abn-hint"
                  className="mt-1 text-xs text-muted-foreground"
                >
                  9 or 11 digits, spaces optional
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" variant="default" size="default" disabled={saving}>
                {saving ? "Saving…" : "Next"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {step === "contact" && (
        <Card variant="outlined">
          <CardHeader>
            <CardTitle>Contact and address</CardTitle>
            <CardDescription>
              How can participants reach you? Include at least one contact method.
            </CardDescription>
          </CardHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              patch({
                phone: (form.querySelector('[name="phone"]') as HTMLInputElement)
                  ?.value?.trim() || null,
                email: (form.querySelector('[name="email"]') as HTMLInputElement)
                  ?.value?.trim() || null,
                website: (form.querySelector('[name="website"]') as HTMLInputElement)
                  ?.value?.trim() || null,
                suburb: (form.querySelector('[name="suburb"]') as HTMLInputElement)
                  ?.value?.trim() || null,
                state: (form.querySelector('[name="state"]') as HTMLSelectElement)
                  ?.value || null,
                postcode: (form.querySelector('[name="postcode"]') as HTMLInputElement)
                  ?.value?.trim() || null,
              }).then(() => setStepIndex(2));
            }}
          >
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="onboarding-phone" className="text-sm font-medium">
                  Phone
                </label>
                <input
                  id="onboarding-phone"
                  name="phone"
                  type="tel"
                  defaultValue={onboarding.phone ?? ""}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  disabled={saving}
                />
              </div>
              <div>
                <label htmlFor="onboarding-email" className="text-sm font-medium">
                  Email
                </label>
                <input
                  id="onboarding-email"
                  name="email"
                  type="email"
                  defaultValue={onboarding.email ?? ""}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  disabled={saving}
                />
              </div>
              <div>
                <label htmlFor="onboarding-website" className="text-sm font-medium">
                  Website
                </label>
                <input
                  id="onboarding-website"
                  name="website"
                  type="url"
                  defaultValue={onboarding.website ?? ""}
                  placeholder="https://"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  disabled={saving}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="onboarding-suburb" className="text-sm font-medium">
                    Suburb
                  </label>
                  <input
                    id="onboarding-suburb"
                    name="suburb"
                    type="text"
                    defaultValue={onboarding.suburb ?? ""}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label htmlFor="onboarding-state" className="text-sm font-medium">
                    State
                  </label>
                  <select
                    id="onboarding-state"
                    name="state"
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    defaultValue={onboarding.state ?? ""}
                    disabled={saving}
                  >
                    <option value="">Select</option>
                    {STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="onboarding-postcode" className="text-sm font-medium">
                  Postcode
                </label>
                <input
                  id="onboarding-postcode"
                  name="postcode"
                  type="text"
                  inputMode="numeric"
                  defaultValue={onboarding.postcode ?? ""}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  disabled={saving}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="button" variant="outline" size="default" onClick={() => setStepIndex(0)}>
                Back
              </Button>
              <Button type="submit" variant="default" size="default" disabled={saving}>
                {saving ? "Saving…" : "Next"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {step === "categories" && (
        <Card variant="outlined">
          <CardHeader>
            <CardTitle>Service categories</CardTitle>
            <CardDescription>
              Select the support categories you offer (at least one).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Service categories">
              {PROVIDER_CATEGORIES.map((cat) => {
                const selected = onboarding.categories.includes(cat);
                return (
                  <Badge
                    key={cat}
                    variant={selected ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      const next = selected
                        ? onboarding.categories.filter((c) => c !== cat)
                        : [...onboarding.categories, cat];
                      setData((prev) =>
                        prev ? { ...prev, categories: next } : null,
                      );
                      patch({ categories: next });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        const next = selected
                          ? onboarding.categories.filter((c) => c !== cat)
                          : [...onboarding.categories, cat];
                        setData((prev) =>
                          prev ? { ...prev, categories: next } : null,
                        );
                        patch({ categories: next });
                      }
                    }}
                    tabIndex={0}
                  >
                    {cat}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="button" variant="outline" size="default" onClick={() => setStepIndex(1)}>
              Back
            </Button>
            <Button
              type="button"
              variant="default"
              size="default"
              disabled={onboarding.categories.length === 0 || saving}
              onClick={() => patch({ categories: onboarding.categories }).then(() => setStepIndex(3))}
            >
              Next
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === "hours" && (
        <Card variant="outlined">
          <CardHeader>
            <CardTitle>Opening hours and description</CardTitle>
            <CardDescription>
              Optional: add opening hours and a short description.
            </CardDescription>
          </CardHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              patch({
                openingHours: (form.querySelector('[name="openingHours"]') as HTMLTextAreaElement)
                  ?.value?.trim() || null,
                description: (form.querySelector('[name="description"]') as HTMLTextAreaElement)
                  ?.value?.trim() || null,
              }).then(() => setStepIndex(4));
            }}
          >
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="onboarding-hours" className="text-sm font-medium">
                  Opening hours
                </label>
                <textarea
                  id="onboarding-hours"
                  name="openingHours"
                  rows={2}
                  defaultValue={onboarding.openingHours ?? ""}
                  placeholder="e.g. Monday: 9AM–5PM, Tuesday: 9AM–5PM"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  disabled={saving}
                />
              </div>
              <div>
                <label htmlFor="onboarding-desc" className="text-sm font-medium">
                  Short description
                </label>
                <textarea
                  id="onboarding-desc"
                  name="description"
                  rows={3}
                  defaultValue={onboarding.description ?? ""}
                  placeholder="A brief description of your services."
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  disabled={saving}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="button" variant="outline" size="default" onClick={() => setStepIndex(2)}>
                Back
              </Button>
              <Button type="submit" variant="default" size="default" disabled={saving}>
                Next
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {step === "confirm" && (
        <Card variant="outlined">
          <CardHeader>
            <CardTitle>Confirm and go live</CardTitle>
            <CardDescription>
              Review your profile. Click Complete to publish.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>{onboarding.name}</strong></p>
            {(onboarding.phone || onboarding.email) && (
              <p>
                {onboarding.phone}
                {onboarding.phone && onboarding.email && " · "}
                {onboarding.email}
              </p>
            )}
            {(onboarding.suburb || onboarding.state) && (
              <p>{[onboarding.suburb, onboarding.state, onboarding.postcode].filter(Boolean).join(" ")}</p>
            )}
            {onboarding.categories.length > 0 && (
              <p className="flex flex-wrap gap-1">
                {onboarding.categories.map((c) => (
                  <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                ))}
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button type="button" variant="outline" size="default" onClick={() => setStepIndex(3)}>
              Back
            </Button>
            <Button
              type="button"
              variant="default"
              size="default"
              disabled={saving}
              onClick={() => patch({ complete: true })}
            >
              {saving ? "Completing…" : "Complete onboarding"}
            </Button>
          </CardFooter>
        </Card>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Need help? Contact us to complete your profile with support.
      </p>
    </div>
  );
}
