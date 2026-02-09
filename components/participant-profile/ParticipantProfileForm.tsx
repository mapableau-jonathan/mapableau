"use client";

import { Loader2 } from "lucide-react";
import React, { useState } from "react";

import { PROVIDER_CATEGORIES } from "@/app/provider-finder/providers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PLACE_LABEL } from "@/lib/place";
import { parseResponseJson } from "@/lib/utils";

import type { ParticipantProfileData } from "./types";

const AU_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"] as const;

type FormState = {
  displayName: string;
  visibility: "private" | "public";
  slug: string;
  accessibilityNeeds: string;
  preferredCategories: string[];
  suburb: string;
  state: string;
  postcode: string;
};

const emptyForm: FormState = {
  displayName: "",
  visibility: "private",
  slug: "",
  accessibilityNeeds: "",
  preferredCategories: [],
  suburb: "",
  state: "",
  postcode: "",
};

function toFormState(
  profile: ParticipantProfileData | null,
  suggestedSlugFromProfiles: string | null,
): FormState {
  if (profile) {
    return {
      displayName: profile.displayName ?? "",
      visibility: profile.visibility,
      slug: profile.slug ?? "",
      accessibilityNeeds: profile.accessibilityNeeds ?? "",
      preferredCategories: profile.preferredCategories ?? [],
      suburb: profile.suburb ?? "",
      state: profile.state ?? "",
      postcode: profile.postcode ?? "",
    };
  }
  return {
    ...emptyForm,
    slug: suggestedSlugFromProfiles ?? "",
  };
}

export function ParticipantProfileForm({
  profile,
  suggestedSlugFromProfiles = null,
  onSuccess,
}: {
  profile: ParticipantProfileData | null;
  suggestedSlugFromProfiles?: string | null;
  onSuccess?: () => void;
}) {
  const [form, setForm] = useState<FormState>(() =>
    toFormState(profile, suggestedSlugFromProfiles ?? null),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        displayName: form.displayName.trim() || null,
        visibility: form.visibility,
        accessibilityNeeds: form.accessibilityNeeds.trim() || null,
        preferredCategories: form.preferredCategories,
        suburb: form.suburb.trim() || null,
        state: form.state || null,
        postcode: form.postcode.trim() || null,
        savedProviderIds: [],
      };
      if (form.visibility === "public") {
        body.slug = form.slug.trim() || form.displayName.trim() || "profile";
      } else {
        body.slug = null;
      }
      const res = await fetch("/api/participants/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await parseResponseJson<{ error?: string }>(res);
        throw new Error(data?.error || "Failed to save");
      }
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setForm((prev) => ({
      ...prev,
      preferredCategories: prev.preferredCategories.includes(cat)
        ? prev.preferredCategories.filter((c) => c !== cat)
        : [...prev.preferredCategories, cat],
    }));
  };

  return (
    <Card variant="gradient" className="overflow-hidden">
      <CardHeader>
        <CardTitle>{profile ? "Edit participant profile" : "Create participant profile"}</CardTitle>
        <CardDescription>
          Support categories that match your plan. Share your profile with providers when public.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div>
            <label htmlFor="displayName" className="mb-1 block text-sm font-medium text-foreground">
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              value={form.displayName}
              onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="How you'd like to be shown"
            />
          </div>
          <div>
            <span className="mb-2 block text-sm font-medium text-foreground">Visibility</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="visibility"
                  checked={form.visibility === "private"}
                  onChange={() => setForm((p) => ({ ...p, visibility: "private", slug: "" }))}
                  className="rounded-full border-input"
                />
                <span className="text-sm">Private (dashboard only)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="visibility"
                  checked={form.visibility === "public"}
                  onChange={() =>
                    setForm((p) => ({
                      ...p,
                      visibility: "public",
                      slug: (p.slug && p.slug.trim()) ? p.slug : (suggestedSlugFromProfiles ?? ""),
                    }))
                  }
                  className="rounded-full border-input"
                />
                <span className="text-sm">Public (shareable link)</span>
              </label>
            </div>
          </div>
          {form.visibility === "public" && (
            <div>
              <label htmlFor="slug" className="mb-1 block text-sm font-medium text-foreground">
                Profile URL slug
              </label>
              <input
                id="slug"
                type="text"
                value={form.slug}
                onChange={(e) =>
                  setForm((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") }))
                }
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={suggestedSlugFromProfiles || "my-profile"}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Unique URL: /jonathan/participant/[slug]. Derived from your claimed provider profile when available.
              </p>
            </div>
          )}
          <div>
            <label htmlFor="accessibilityNeeds" className="mb-1 block text-sm font-medium text-foreground">
              Accessibility needs (optional)
            </label>
            <textarea
              id="accessibilityNeeds"
              value={form.accessibilityNeeds}
              onChange={(e) => setForm((p) => ({ ...p, accessibilityNeeds: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Any access requirements you'd like to share"
            />
          </div>
          <div>
            <span className="mb-2 block text-sm font-medium text-foreground">
              Support categories that match your plan
            </span>
            <div className="flex flex-wrap gap-2">
              {(PROVIDER_CATEGORIES as readonly string[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    form.preferredCategories.includes(cat)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background hover:bg-accent"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <section aria-labelledby="place-heading">
            <h3 id="place-heading" className="mb-3 text-sm font-semibold text-foreground">
              {PLACE_LABEL}
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="suburb" className="mb-1 block text-sm font-medium text-foreground">
                Suburb
              </label>
              <input
                id="suburb"
                type="text"
                value={form.suburb}
                onChange={(e) => setForm((p) => ({ ...p, suburb: e.target.value }))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="state" className="mb-1 block text-sm font-medium text-foreground">
                State
              </label>
              <select
                id="state"
                value={form.state}
                onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select</option>
                {AU_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="postcode" className="mb-1 block text-sm font-medium text-foreground">
                Postcode
              </label>
              <input
                id="postcode"
                type="text"
                value={form.postcode}
                onChange={(e) => setForm((p) => ({ ...p, postcode: e.target.value }))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            </div>
          </section>
          <div className="flex gap-3">
            <Button type="submit" variant="default" size="default" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {profile ? "Save changes" : "Create profile"}
            </Button>
            {onSuccess && (
              <Button type="button" variant="outline" size="default" onClick={onSuccess}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
