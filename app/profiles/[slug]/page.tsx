"use client";

import {
  ArrowLeft,
  Check,
  Clock,
  Edit3,
  Globe,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";

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

type ClaimedProfile = {
  id: string;
  slug: string;
  name: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  openingHours: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  categories: string[];
  isOwner?: boolean;
};

function formatLocation(p: ClaimedProfile) {
  const parts = [p.suburb, p.state, p.postcode].filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join(" ");
}

function ClaimedProfileView({
  profile,
  isOwner,
  onEdit,
}: {
  profile: ClaimedProfile;
  isOwner: boolean;
  onEdit: () => void;
}) {
  const location = formatLocation(profile);
  const hasContact =
    profile.phone || profile.email || profile.website || profile.description;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            href="/provider-finder"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Provider Finder
          </Link>
          {isOwner && (
            <Button variant="outline" size="default" onClick={onEdit}>
              <Edit3 className="mr-2 h-4 w-4" />
              Edit profile
            </Button>
          )}
        </div>

        <Card variant="gradient" className="overflow-hidden">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-2xl sm:text-3xl">
                  {profile.name}
                </CardTitle>
                {location && (
                  <CardDescription className="mt-2 flex items-center gap-1.5 text-base">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {location}
                  </CardDescription>
                )}
              </div>
              <div className="flex shrink-0">
                <Badge
                  variant="outline"
                  className="border-primary/20 bg-primary/5 px-3 py-1.5 text-primary"
                >
                  <ShieldCheck className="mr-1.5 h-4 w-4" />
                  Claimed
                </Badge>
              </div>
            </div>

            {profile.categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {profile.categories.map((cat) => (
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
          </CardHeader>

          <CardContent className="space-y-6 border-t border-border/70 pt-6">
            {profile.description && (
              <section>
                <p className="text-sm text-muted-foreground">
                  {profile.description}
                </p>
              </section>
            )}

            {hasContact && (
              <section>
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  Contact &amp; business details
                </h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  {profile.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <a
                        href={`tel:${profile.phone.replace(/\s/g, "")}`}
                        className="text-primary hover:underline"
                      >
                        {profile.phone}
                      </a>
                    </div>
                  )}
                  {profile.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <a
                        href={`mailto:${profile.email}`}
                        className="break-all text-primary hover:underline"
                      >
                        {profile.email}
                      </a>
                    </div>
                  )}
                  {profile.website && (
                    <div className="flex items-start gap-3">
                      <Globe className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <a
                        href={
                          profile.website.startsWith("http")
                            ? profile.website
                            : `https://${profile.website}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-primary hover:underline"
                      >
                        {profile.website}
                      </a>
                    </div>
                  )}
                </div>
              </section>
            )}

            {profile.openingHours && (
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Clock className="h-4 w-4" />
                  Opening hours
                </h3>
                <div className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm tabular-nums">
                  {profile.openingHours
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
                        <span className="text-muted-foreground">{day}</span>
                        <span>{hours || "—"}</span>
                      </React.Fragment>
                    ))}
                </div>
              </section>
            )}
          </CardContent>

          <CardFooter className="flex gap-3 border-t border-border/70 pt-6">
            {profile.phone && (
              <Button
                asChild
                variant="default"
                size="default"
                className="flex-1"
              >
                <a href={`tel:${profile.phone.replace(/\s/g, "")}`}>Call</a>
              </Button>
            )}
            {profile.email && (
              <Button
                asChild
                variant="outline"
                size="default"
                className="flex-1"
              >
                <a href={`mailto:${profile.email}`}>Email</a>
              </Button>
            )}
            {profile.website && (
              <Button
                asChild
                variant="outline"
                size="default"
                className="flex-1"
              >
                <a
                  href={
                    profile.website.startsWith("http")
                      ? profile.website
                      : `https://${profile.website}`
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

function EditProfileModal({
  profile,
  onClose,
  onSave,
}: {
  profile: ClaimedProfile;
  onClose: () => void;
  onSave: (data: Partial<ClaimedProfile>) => void;
}) {
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [email, setEmail] = useState(profile.email ?? "");
  const [website, setWebsite] = useState(profile.website ?? "");
  const [description, setDescription] = useState(profile.description ?? "");
  const [openingHours, setOpeningHours] = useState(profile.openingHours ?? "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/profiles/${profile.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone || null,
          email: email || null,
          website: website || null,
          description: description || null,
          openingHours: openingHours || null,
        }),
      });
      if (!res.ok) throw new Error("Update failed");
      const updated = (await res.json()) as ClaimedProfile;
      onSave(updated);
      onClose();
    } catch {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
    >
      <Card variant="outlined" className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle id="edit-profile-title">Edit profile</CardTitle>
          <Button variant="outline" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div>
              <label
                htmlFor="edit-phone"
                className="text-xs font-medium text-muted-foreground"
              >
                Phone
              </label>
              <input
                id="edit-phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="edit-email"
                className="text-xs font-medium text-muted-foreground"
              >
                Email
              </label>
              <input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="edit-website"
                className="text-xs font-medium text-muted-foreground"
              >
                Website
              </label>
              <input
                id="edit-website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="edit-description"
                className="text-xs font-medium text-muted-foreground"
              >
                Description
              </label>
              <textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="edit-hours"
                className="text-xs font-medium text-muted-foreground"
              >
                Opening hours
              </label>
              <textarea
                id="edit-hours"
                value={openingHours}
                onChange={(e) => setOpeningHours(e.target.value)}
                placeholder="Monday: 9AM-5PM, Tuesday: 9AM-5PM, ..."
                rows={2}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="default"
              disabled={saving}
            >
              {saving ? (
                "Saving…"
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function ClaimedProfilePage() {
  const params = useParams();
  const slug = params.slug as string | undefined;
  const [profile, setProfile] = useState<ClaimedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/profiles/${slug}`);
      if (!res.ok) {
        if (res.status === 404) setError("Not found");
        else setError("Failed to load");
        setProfile(null);
        return;
      }
      const data = (await res.json()) as ClaimedProfile;
      setProfile(data);
    } catch {
      setError("Failed to load");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card variant="outlined" className="p-8 text-center max-w-md">
          <p className="text-muted-foreground">Loading profile…</p>
        </Card>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card variant="outlined" className="p-8 text-center max-w-md">
          <h2 className="text-lg font-semibold">Profile not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {error ?? `No profile matches "${slug}".`}
          </p>
          <Button asChild variant="outline" size="default" className="mt-4">
            <Link href="/provider-finder">Back to Provider Finder</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <>
      <ClaimedProfileView
        profile={profile}
        isOwner={profile.isOwner ?? false}
        onEdit={() => setEditing(true)}
      />
      {editing && (
        <EditProfileModal
          profile={profile}
          onClose={() => setEditing(false)}
          onSave={(updated) =>
            setProfile((p) => (p ? { ...p, ...updated } : p))
          }
        />
      )}
    </>
  );
}
