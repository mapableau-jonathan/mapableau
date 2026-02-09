"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

import { ParticipantProfileForm } from "@/components/participant-profile";
import type { ParticipantProfileData } from "@/components/participant-profile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { parseResponseJson } from "@/lib/utils";

export default function JonathanParticipantPage() {
  const { status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<ParticipantProfileData | null | "loading">("loading");
  const [suggestedSlugFromProfiles, setSuggestedSlugFromProfiles] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/participants/me");
    if (res.status === 401) {
      router.replace("/login");
      return;
    }
    const body = await parseResponseJson<
      | (ParticipantProfileData & { suggestedSlugFromProfiles?: string | null })
      | { error: string; suggestedSlugFromProfiles?: string | null }
    >(res);
    if (res.status === 404) {
      setProfile(null);
      setSuggestedSlugFromProfiles(body?.suggestedSlugFromProfiles ?? null);
      return;
    }
    if (!res.ok) {
      setProfile(null);
      setSuggestedSlugFromProfiles(null);
      return;
    }
    if (!body) {
      setProfile(null);
      return;
    }
    const data = body as ParticipantProfileData & { suggestedSlugFromProfiles?: string | null };
    setProfile(data);
    setSuggestedSlugFromProfiles(data.suggestedSlugFromProfiles ?? null);
  }, [router]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status === "authenticated") load();
  }, [status, router, load]);

  const handleSuccess = useCallback(() => {
    load();
    router.push("/jonathan/dashboard");
  }, [load, router]);

  if (status === "loading" || profile === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Card variant="outlined" className="p-8 text-center">
          <p className="text-muted-foreground">Loading…</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <nav aria-label="Breadcrumb">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground">
          <Link href="/jonathan/dashboard">← Dashboard</Link>
        </Button>
      </nav>
      <ParticipantProfileForm
        profile={profile ?? null}
        suggestedSlugFromProfiles={suggestedSlugFromProfiles}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
