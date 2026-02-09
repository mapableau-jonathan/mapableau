"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ParticipantProfileView } from "@/components/participant-profile";
import type { ParticipantProfilePublic } from "@/components/participant-profile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildPath } from "@/lib/router";
import { parseResponseJson } from "@/lib/utils";

export default function JonathanParticipantSlugPage() {
  const params = useParams();
  const slug = params.slug as string | undefined;
  const [profile, setProfile] = useState<ParticipantProfilePublic | null>(null);
  const [status, setStatus] = useState<"loading" | "found" | "notfound">("loading");

  const load = useCallback(async () => {
    if (!slug) {
      setStatus("notfound");
      return;
    }
    const res = await fetch(`/api/participants/${encodeURIComponent(slug)}`);
    if (res.status === 404) {
      setStatus("notfound");
      return;
    }
    if (!res.ok) {
      setStatus("notfound");
      return;
    }
    const data = await parseResponseJson<ParticipantProfilePublic>(res);
    if (!data) {
      setStatus("notfound");
      return;
    }
    setProfile(data);
    setStatus("found");
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Card variant="outlined" className="p-8 text-center">
          <p className="text-muted-foreground">Loading…</p>
        </Card>
      </div>
    );
  }

  if (status === "notfound" || !profile) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <Card variant="outlined" className="p-8 text-center">
          <h2 className="text-lg font-semibold">Profile not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This profile doesn&apos;t exist or is private.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href={buildPath("jonathan", {})}>Back to Jonathan</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <nav aria-label="Breadcrumb">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground">
          <Link href={buildPath("jonathan", {})}>← Jonathan</Link>
        </Button>
      </nav>
      <ParticipantProfileView profile={profile} />
    </div>
  );
}
