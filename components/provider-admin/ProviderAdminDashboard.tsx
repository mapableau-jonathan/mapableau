"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { MultiValue, StylesConfig } from "react-select";
import Select from "react-select";

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
  PatchProviderPayload,
  patchProviderPayloadSchema,
  PatchWorkerPayload,
} from "@/schemas/provider-admin.types";

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type ProviderSpecOption = { value: string; label: string };

const providerSpecSelectStyles: StylesConfig<ProviderSpecOption, true> = {
  control: (base, state) => ({
    ...base,
    minHeight: "42px",
    borderRadius: "0.5rem",
    borderColor: "hsl(var(--input))",
    backgroundColor: "hsl(var(--background))",
    boxShadow: state.isFocused
      ? "0 0 0 2px hsl(var(--ring) / 0.25)"
      : "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    "&:hover": { borderColor: "hsl(var(--input))" },
  }),
  menu: (base) => ({
    ...base,
    borderRadius: "0.5rem",
    border: "1px solid hsl(var(--border))",
    backgroundColor: "hsl(var(--popover))",
    zIndex: 50,
    boxShadow:
      "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  }),
  menuList: (base) => ({ ...base, padding: "0.25rem" }),
  multiValue: (base) => ({
    ...base,
    borderRadius: "0.375rem",
    backgroundColor: "hsl(var(--muted))",
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: "hsl(var(--foreground))",
    fontSize: "0.875rem",
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: "hsl(var(--muted-foreground))",
    ":hover": {
      backgroundColor: "hsl(var(--destructive) / 0.12)",
      color: "hsl(var(--destructive))",
    },
  }),
  option: (base, state) => ({
    ...base,
    fontSize: "0.875rem",
    cursor: "pointer",
    backgroundColor: state.isSelected
      ? "hsl(var(--primary) / 0.15)"
      : state.isFocused
        ? "hsl(var(--muted))"
        : "transparent",
    color: "hsl(var(--foreground))",
  }),
  input: (base) => ({ ...base, color: "hsl(var(--foreground))" }),
  placeholder: (base) => ({
    ...base,
    color: "hsl(var(--muted-foreground))",
    fontSize: "0.875rem",
  }),
  singleValue: (base) => ({ ...base, color: "hsl(var(--foreground))" }),
  indicatorSeparator: (base) => ({
    ...base,
    backgroundColor: "hsl(var(--border))",
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: "hsl(var(--muted-foreground))",
  }),
  clearIndicator: (base) => ({
    ...base,
    color: "hsl(var(--muted-foreground))",
  }),
};

function serviceAreasListToLines(serviceAreas: string[]) {
  return serviceAreas.map((s) => `${s}`).join("\n");
}

function linesToList(text: string) {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

type OrgFormValues = {
  name: string;
  logoUrl: string;
  description: string;
  website: string;
  email: string;
  phone: string;
  abn: string;
  businessType: string;
  ndisRegistered: boolean;
  ndisNumber: string;
  serviceAreas: string;
  providerSpecialisationIds: string[];
};

function providerToFormValues(
  provider: GetAdminResponse["provider"],
): OrgFormValues {
  return {
    name: provider.name,
    logoUrl: provider.logoUrl ?? "",
    description: provider.description ?? "",
    website: provider.website ?? "",
    email: provider.email ?? "",
    phone: provider.phone ?? "",
    abn: provider.abn ?? "",
    businessType: provider.businessType ?? "",
    ndisRegistered: provider.ndisRegistered,
    ndisNumber: provider.ndisNumber ?? "",
    serviceAreas: serviceAreasListToLines(provider.serviceAreas),
    providerSpecialisationIds: provider.specialisations.map((s) => s.id),
  };
}

function formValuesToPatchPayload(
  values: OrgFormValues,
  catalog: GetCatalogResponse,
): PatchProviderPayload {
  const serviceAreas = linesToList(values.serviceAreas);
  const byId = new Map(
    catalog.providerSpecialisations.map((d) => [d.id, d] as const),
  );
  const specialisations: { id: string; name: string }[] =
    values.providerSpecialisationIds.map((id) => {
      const def = byId.get(id);
      if (!def) {
        throw new Error(`Unknown provider specialisation id: ${id}`);
      }
      return { id: def.id, name: def.name };
    });

  return {
    name: values.name.trim() || null,
    logoUrl: values.logoUrl.trim() || null,
    description: values.description.trim() || null,
    website: values.website.trim() || null,
    email: values.email.trim() || null,
    phone: values.phone.trim() || null,
    abn: values.abn.trim() || null,
    businessType: values.businessType.trim() || null,
    ndisRegistered: values.ndisRegistered,
    ndisNumber: values.ndisNumber.trim() || null,
    serviceAreas: serviceAreas,
    specialisations: specialisations,
  };
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

  const canEditOrg = adminQuery.data?.canEditOrganization ?? false;

  const orgForm = useForm<OrgFormValues>({
    defaultValues: providerToFormValues(adminPayload.provider),
  });

  const { reset, register, handleSubmit, control } = orgForm;
  const orgMutation = useMutation({
    mutationFn: async (body: PatchProviderPayload) => {
      const validated = patchProviderPayloadSchema.safeParse(body);
      if (!validated.success) {
        throw new Error("Invalid payload");
      }

      const res = await fetch(`/api/provider-admin/${providerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated.data),
      });
      const data = await res
        .json()
        .catch(() => new Error("Failed to parse response"));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Save failed",
        );
      }
      return data as { provider: GetAdminResponse["provider"] };
    },
    onSuccess: (data) => {
      setOrgMessage({ ok: true, text: "Saved organisation details." });
      reset(providerToFormValues(data.provider));
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

  const p = adminQuery.data.provider;

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

        {tab === "org" && (
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
              <form
                className="space-y-4"
                onSubmit={handleSubmit((values) => {
                  setOrgMessage(null);
                  if (!values.name.trim()) {
                    setOrgMessage({
                      ok: false,
                      text: "Name cannot be empty.",
                    });
                    return;
                  }
                  const catalog = catalogQuery.data ?? adminCatalog;
                  try {
                    orgMutation.mutate(
                      formValuesToPatchPayload(values, catalog),
                    );
                  } catch (e) {
                    setOrgMessage({
                      ok: false,
                      text:
                        e instanceof Error ? e.message : "Invalid form data.",
                    });
                  }
                })}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium">Name</span>
                    <input
                      className={inputClass}
                      disabled={!canEditOrg}
                      {...register("name")}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium">Logo URL</span>
                    <input
                      className={inputClass}
                      disabled={!canEditOrg}
                      {...register("logoUrl")}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium">Email</span>
                    <input
                      className={inputClass}
                      disabled={!canEditOrg}
                      {...register("email")}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium">Phone</span>
                    <input
                      className={inputClass}
                      disabled={!canEditOrg}
                      {...register("phone")}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium">Website</span>
                    <input
                      className={inputClass}
                      disabled={!canEditOrg}
                      {...register("website")}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium">ABN</span>
                    <input
                      className={inputClass}
                      disabled={!canEditOrg}
                      {...register("abn")}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium">Business type</span>
                    <input
                      className={inputClass}
                      disabled={!canEditOrg}
                      {...register("businessType")}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium">
                      NDIS registration #
                    </span>
                    <input
                      className={inputClass}
                      disabled={!canEditOrg}
                      {...register("ndisNumber")}
                    />
                  </label>
                </div>
                <Controller
                  name="ndisRegistered"
                  control={control}
                  render={({ field }) => (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-input"
                        disabled={!canEditOrg}
                        checked={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        ref={field.ref}
                      />
                      NDIS registered
                    </label>
                  )}
                />
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium">Description</span>
                  <textarea
                    className={cn(inputClass, "min-h-[100px]")}
                    disabled={!canEditOrg}
                    {...register("description")}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium">
                    Service areas (one per line)
                  </span>
                  <textarea
                    className={cn(inputClass, "min-h-[80px]")}
                    disabled={!canEditOrg}
                    {...register("serviceAreas")}
                  />
                </label>
                <div className="block space-y-1.5">
                  <span className="text-sm font-medium">Specialisations</span>
                  <Controller
                    name="providerSpecialisationIds"
                    control={control}
                    render={({ field }) => {
                      const catalog = catalogQuery.data ?? adminCatalog;
                      const options: ProviderSpecOption[] =
                        catalog.providerSpecialisations.map((s) => ({
                          value: s.id,
                          label: s.name,
                        }));
                      const selected: MultiValue<ProviderSpecOption> =
                        options.filter((o) => field.value.includes(o.value));
                      return (
                        <Select<ProviderSpecOption, true>
                          instanceId="provider-org-specialisations"
                          isMulti
                          isClearable
                          closeMenuOnSelect={false}
                          isDisabled={!canEditOrg}
                          options={options}
                          value={selected}
                          onChange={(next) => {
                            field.onChange(
                              next ? next.map((o) => o.value) : [],
                            );
                          }}
                          onBlur={field.onBlur}
                          placeholder="Search and select specialisations…"
                          noOptionsMessage={() => "No matches"}
                          styles={providerSpecSelectStyles}
                          classNamePrefix="provider-spec-select"
                        />
                      );
                    }}
                  />
                  {catalogQuery.isLoading &&
                  adminCatalog.providerSpecialisations.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Loading catalogue…
                    </p>
                  ) : null}
                </div>
                {canEditOrg && (
                  <Button
                    variant="default"
                    size="default"
                    loading={orgMutation.isPending}
                    type="submit"
                  >
                    Save organisation
                  </Button>
                )}
              </form>
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
            languageDefinitionIds: langIds,
            specialisationDefinitionIds: specIds,
          } satisfies PatchWorkerPayload),
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
