"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/app/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  GetAdminResponse,
  GetCatalogResponse,
} from "@/schemas/provider-admin.types";

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function linesToList(text: string) {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function listToLines(list: string[]) {
  return list.join("\n");
}

export function ProviderAdminDashboard({
  providerId,
  adminPayload,
  adminCatalog,
}: {
  providerId: string;
  adminPayload: GetAdminResponse;
  adminCatalog: GetCatalogResponse;
}) {
  const { status, data: sessionData } = useSession();
  const sessionUserId = sessionData?.user?.id;
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"org" | "team">("org");
  const [orgMessage, setOrgMessage] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const adminQuery = useQuery<GetAdminResponse, Error>({
    queryKey: ["provider-admin", providerId],
    queryFn: async () => {
      const res = await fetch(`/api/provider-admin/${providerId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          typeof err.error === "string" ? err.error : `Error ${res.status}`,
        );
      }
      return res.json() as Promise<GetAdminResponse>;
    },
    enabled: status === "authenticated",
    initialData: adminPayload,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const catalogQuery = useQuery<GetCatalogResponse, Error>({
    queryKey: ["provider-admin-catalog"],
    queryFn: async () => {
      const res = await fetch("/api/provider-admin/catalog");
      if (!res.ok) throw new Error("Failed to load catalog");
      return res.json() as Promise<GetCatalogResponse>;
    },
    enabled: status === "authenticated" && tab === "team",
    initialData: adminCatalog,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const p = adminQuery.data?.provider;
  const canEditOrg = adminQuery.data?.canEditOrganization ?? false;

  const [orgDraft, setOrgDraft] = useState<GetAdminResponse["provider"] | null>(
    null,
  );
  const orgSyncedForProvider = useRef<string | null>(null);

  useEffect(() => {
    orgSyncedForProvider.current = null;
  }, [providerId]);

  useEffect(() => {
    const id = adminQuery.data?.provider?.id;
    if (!id || orgSyncedForProvider.current === providerId) return;
    orgSyncedForProvider.current = providerId;
    setOrgDraft(adminQuery.data!.provider);
  }, [providerId, adminQuery.data]);

  const displayOrg = orgDraft ?? p;

  const orgMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(`/api/provider-admin/${providerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Save failed",
        );
      }
      return data as { provider: GetAdminResponse["provider"] };
    },
    onSuccess: (data) => {
      setOrgDraft(data.provider);
      setOrgMessage({ ok: true, text: "Saved organisation details." });
      void queryClient.invalidateQueries({
        queryKey: ["provider-admin", providerId],
      });
    },
    onError: (e: Error) => {
      setOrgMessage({ ok: false, text: e.message });
    },
  });

  if (status === "loading" || adminQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (adminQuery.isError || !adminQuery.data) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <Card>
          <CardHeader>
            <CardTitle>Could not load dashboard</CardTitle>
            <CardDescription>
              {adminQuery.error instanceof Error
                ? adminQuery.error.message
                : "Try again or contact support."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="default" asChild>
              <Link href="/provider-admin">Back</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Provider admin
            </p>
            <h1 className="font-heading text-xl font-bold sm:text-2xl">
              {p?.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Role: {adminQuery.data.role}
              {!canEditOrg &&
                " — organisation editing is limited to Admin/Manager."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`/provider/${providerId}`}
                target="_blank"
                rel="noreferrer"
              >
                View public page
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/provider-admin">All providers</Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => void signOut({ callbackUrl: "/" })}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <nav className="mb-6 flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
          {(
            [
              ["org", "Organisation"],
              ["team", "Team"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                setOrgMessage(null);
              }}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
                tab === key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === "org" && displayOrg && (
          <Card>
            <CardHeader>
              <CardTitle>Organisation details</CardTitle>
              <CardDescription>
                Information shown on your public provider listing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {orgMessage && (
                <p
                  className={cn(
                    "text-sm",
                    orgMessage.ok ? "text-secondary" : "text-destructive",
                  )}
                >
                  {orgMessage.text}
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Name"
                  value={displayOrg.name}
                  disabled={!canEditOrg}
                  onChange={(v) =>
                    setOrgDraft((d) => (d ? { ...d, name: v } : null))
                  }
                />
                <Field
                  label="Logo URL"
                  value={displayOrg.logoUrl ?? ""}
                  disabled={!canEditOrg}
                  onChange={(v) =>
                    setOrgDraft((d) =>
                      d ? { ...d, logoUrl: v || null } : null,
                    )
                  }
                />
                <Field
                  label="Email"
                  value={displayOrg.email ?? ""}
                  disabled={!canEditOrg}
                  onChange={(v) =>
                    setOrgDraft((d) => (d ? { ...d, email: v || null } : null))
                  }
                />
                <Field
                  label="Phone"
                  value={displayOrg.phone ?? ""}
                  disabled={!canEditOrg}
                  onChange={(v) =>
                    setOrgDraft((d) => (d ? { ...d, phone: v || null } : null))
                  }
                />
                <Field
                  label="Website"
                  value={displayOrg.website ?? ""}
                  disabled={!canEditOrg}
                  onChange={(v) =>
                    setOrgDraft((d) =>
                      d ? { ...d, website: v || null } : null,
                    )
                  }
                />
                <Field
                  label="ABN"
                  value={displayOrg.abn ?? ""}
                  disabled={!canEditOrg}
                  onChange={(v) =>
                    setOrgDraft((d) => (d ? { ...d, abn: v || null } : null))
                  }
                />
                <Field
                  label="Business type"
                  value={displayOrg.businessType ?? ""}
                  disabled={!canEditOrg}
                  onChange={(v) =>
                    setOrgDraft((d) =>
                      d ? { ...d, businessType: v || null } : null,
                    )
                  }
                />
                <Field
                  label="NDIS registration #"
                  value={displayOrg.ndisNumber ?? ""}
                  disabled={!canEditOrg}
                  onChange={(v) =>
                    setOrgDraft((d) =>
                      d ? { ...d, ndisNumber: v || null } : null,
                    )
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 rounded border-input"
                  checked={displayOrg.ndisRegistered}
                  disabled={!canEditOrg}
                  onChange={(e) =>
                    setOrgDraft((d) =>
                      d ? { ...d, ndisRegistered: e.target.checked } : null,
                    )
                  }
                />
                NDIS registered
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Description</span>
                <textarea
                  className={cn(inputClass, "min-h-[100px]")}
                  value={displayOrg.description ?? ""}
                  disabled={!canEditOrg}
                  onChange={(e) =>
                    setOrgDraft((d) =>
                      d ? { ...d, description: e.target.value || null } : null,
                    )
                  }
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">
                  Service areas (one per line)
                </span>
                <textarea
                  className={cn(inputClass, "min-h-[80px]")}
                  value={listToLines(displayOrg.serviceAreas)}
                  disabled={!canEditOrg}
                  onChange={(e) =>
                    setOrgDraft((d) =>
                      d
                        ? { ...d, serviceAreas: linesToList(e.target.value) }
                        : null,
                    )
                  }
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">
                  Specialisations (one per line)
                </span>
                <textarea
                  className={cn(inputClass, "min-h-[80px]")}
                  value={listToLines(displayOrg.specialisations)}
                  disabled={!canEditOrg}
                  onChange={(e) =>
                    setOrgDraft((d) =>
                      d
                        ? {
                            ...d,
                            specialisations: linesToList(e.target.value),
                          }
                        : null,
                    )
                  }
                />
              </label>
              {canEditOrg && (
                <Button
                  variant="default"
                  size="default"
                  loading={orgMutation.isPending}
                  type="button"
                  onClick={() => {
                    setOrgMessage(null);
                    if (!orgDraft) return;
                    orgMutation.mutate({
                      name: orgDraft.name,
                      logoUrl: orgDraft.logoUrl,
                      description: orgDraft.description,
                      website: orgDraft.website,
                      email: orgDraft.email,
                      phone: orgDraft.phone,
                      abn: orgDraft.abn,
                      businessType: orgDraft.businessType,
                      ndisRegistered: orgDraft.ndisRegistered,
                      ndisNumber: orgDraft.ndisNumber,
                      serviceAreas: orgDraft.serviceAreas,
                      specialisations: orgDraft.specialisations,
                    });
                  }}
                >
                  Save organisation
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {tab === "team" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Update worker profiles linked to this organisation. Admins and
              managers can edit anyone; staff can only edit their own profile.
            </p>
            {adminQuery.data.workers.map((w) => (
              <WorkerCard
                key={w.id}
                providerId={providerId}
                worker={w}
                sessionUserId={sessionUserId}
                role={adminQuery.data.role}
                catalog={catalogQuery.data}
                catalogLoading={catalogQuery.isLoading}
                onSaved={() => {
                  void queryClient.invalidateQueries({
                    queryKey: ["provider-admin", providerId],
                  });
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input
        className={inputClass}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function WorkerCard({
  providerId,
  worker,
  sessionUserId,
  role,
  catalog,
  catalogLoading,
  onSaved,
}: {
  providerId: string;
  worker: GetAdminResponse["workers"][number];
  sessionUserId: string | undefined;
  role: GetAdminResponse["role"];
  catalog: GetCatalogResponse | undefined;
  catalogLoading: boolean;
  onSaved: () => void;
}) {
  const canEdit =
    role === "ADMIN" ||
    role === "MANAGER" ||
    (role === "STAFF" && sessionUserId === worker.userId);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState(worker.name ?? "");
  const [bio, setBio] = useState(worker.bio ?? "");
  const [quals, setQuals] = useState(worker.qualifications ?? "");
  const [langIds, setLangIds] = useState(() =>
    worker.languages.map((l) => l.id),
  );
  const [specIds, setSpecIds] = useState(() =>
    worker.specialisations.map((s) => s.id),
  );
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/provider-admin/${providerId}/workers/${worker.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim() || null,
            bio: bio.trim() || null,
            qualifications: quals.trim() || null,
            languageIds: langIds,
            specialisationIds: specIds,
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Save failed",
        );
      }
      return data;
    },
    onSuccess: () => {
      setMsg({ ok: true, text: "Saved worker profile." });
      onSaved();
    },
    onError: (e: Error) => setMsg({ ok: false, text: e.message }),
  });

  useEffect(() => {
    setName(worker.name ?? "");
    setBio(worker.bio ?? "");
    setQuals(worker.qualifications ?? "");
    setLangIds(worker.languages.map((l) => l.id));
    setSpecIds(worker.specialisations.map((s) => s.id));
  }, [worker]);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle className="text-lg">
            {worker.name || "Unnamed worker"}
          </CardTitle>
          <CardDescription>{worker.email}</CardDescription>
        </div>
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Close" : "Edit"}
          </Button>
        )}
      </CardHeader>
      {!canEdit && (
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You can’t edit this profile with your current role.
          </p>
        </CardContent>
      )}
      {canEdit && open && (
        <CardContent className="space-y-3 border-t border-border/60 pt-4">
          {msg && (
            <p
              className={cn(
                "text-sm",
                msg.ok ? "text-secondary" : "text-destructive",
              )}
            >
              {msg.text}
            </p>
          )}
          {catalogLoading && (
            <p className="text-sm text-muted-foreground">Loading options…</p>
          )}
          <Field label="Display name" value={name} onChange={setName} />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Bio</span>
            <textarea
              className={cn(inputClass, "min-h-[80px]")}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Qualifications</span>
            <textarea
              className={cn(inputClass, "min-h-[60px]")}
              value={quals}
              onChange={(e) => setQuals(e.target.value)}
            />
          </label>
          {catalog && (
            <>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Languages</legend>
                <div className="flex flex-wrap gap-2">
                  {catalog.languages.map((l) => (
                    <label
                      key={l.id}
                      className="flex items-center gap-1.5 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="size-4 rounded border-input"
                        checked={langIds.includes(l.id)}
                        onChange={(e) => {
                          setLangIds((ids) =>
                            e.target.checked
                              ? [...ids, l.id]
                              : ids.filter((i) => i !== l.id),
                          );
                        }}
                      />
                      {l.name}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Specialisations</legend>
                <div className="flex flex-wrap gap-2">
                  {catalog.specialisations.map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-1.5 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="size-4 rounded border-input"
                        checked={specIds.includes(s.id)}
                        onChange={(e) => {
                          setSpecIds((ids) =>
                            e.target.checked
                              ? [...ids, s.id]
                              : ids.filter((i) => i !== s.id),
                          );
                        }}
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          )}
          <Button
            variant="secondary"
            size="default"
            type="button"
            loading={mutation.isPending}
            onClick={() => {
              setMsg(null);
              mutation.mutate();
            }}
          >
            Save worker
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
