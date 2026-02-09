"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { PLACE_LABEL } from "@/lib/place";
import { AppLink, buildPath } from "@/lib/router";
import { parseResponseJson } from "@/lib/utils";

const AU_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"] as const;

export default function RegisterProviderPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [suburb, setSuburb] = useState("");
  const [state, setState] = useState("");
  const [postcode, setPostcode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/register/provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name,
          ...(suburb.trim() && { suburb: suburb.trim() }),
          ...(state.trim() && { state: state.trim() }),
          ...(postcode.trim() && { postcode: postcode.trim() }),
        }),
      });

      const data = await parseResponseJson<{ id?: string; error?: string }>(res);

      if (!res.ok) {
        setError(data?.error ?? "Registration failed");
        setIsLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: buildPath("onboarding", {}),
      });

      if (result?.ok) {
        router.push(buildPath("onboarding", {}));
        router.refresh();
        return;
      }

      setError("Account created. Please sign in.");
      setIsLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">
        Register as a provider
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Create an account to list your practice and complete your profile.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 flex flex-col gap-4"
        noValidate
      >
        <div>
          <label htmlFor="provider-name" className="text-sm font-medium">
            Business or practice name
          </label>
          <input
            id="provider-name"
            type="text"
            placeholder="e.g. Acme Support Services"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            autoComplete="organization"
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="provider-email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="provider-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            autoComplete="email"
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="provider-password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="provider-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            autoComplete="new-password"
            disabled={isLoading}
          />
        </div>
        <section aria-labelledby="provider-place-heading">
          <h3 id="provider-place-heading" className="mb-3 text-sm font-semibold text-foreground">
            {PLACE_LABEL} (optional)
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="provider-suburb" className="mb-1 block text-sm font-medium text-foreground">
                Suburb
              </label>
              <input
                id="provider-suburb"
                type="text"
                value={suburb}
                onChange={(e) => setSuburb(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="provider-state" className="mb-1 block text-sm font-medium text-foreground">
                State
              </label>
              <select
                id="provider-state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isLoading}
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
              <label htmlFor="provider-postcode" className="mb-1 block text-sm font-medium text-foreground">
                Postcode
              </label>
              <input
                id="provider-postcode"
                type="text"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isLoading}
              />
            </div>
          </div>
        </section>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isLoading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <AppLink
          route="login"
          params={{}}
          className="text-primary underline hover:no-underline"
        >
          Sign in
        </AppLink>
      </p>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Need help? Contact us to register with support.
      </p>
    </div>
  );
}
