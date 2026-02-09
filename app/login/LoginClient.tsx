"use client";

import { Loader2, MapPin } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { getLocationAndPostcode } from "@/lib/geo";
import { PLACE_LABEL } from "@/lib/place";
import { buildPath } from "@/lib/router";

type SocialProvider = "auth0" | "google" | "facebook" | "azure-ad";

const SOCIAL_BUTTONS: { provider: SocialProvider; label: string }[] = [
  { provider: "google", label: "Sign in with Google" },
  { provider: "facebook", label: "Sign in with Facebook" },
  { provider: "azure-ad", label: "Sign in with Microsoft" },
  { provider: "auth0", label: "Sign in with Auth0" },
];

const AU_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"] as const;

type PlaceState = { postcode: string; suburb: string; state: string };

function buildCallbackUrl(base: string, place: PlaceState | null): string {
  if (!place || ![place.postcode, place.suburb, place.state].some((v) => v.trim())) {
    return base;
  }
  const providerFinderPath = buildPath("providerFinder", {});
  const params = new URLSearchParams();
  if (place.postcode.trim()) params.set("postcode", place.postcode.trim());
  if (place.suburb.trim()) params.set("suburb", place.suburb.trim());
  if (place.state.trim()) params.set("state", place.state.trim());
  const query = params.toString();
  return query ? `${providerFinderPath}?${query}` : providerFinderPath;
}

type LoginClientProps = { callbackUrlOverride?: string };

export default function LoginClient({ callbackUrlOverride }: LoginClientProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const baseCallbackUrl =
    callbackUrlOverride ?? searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [place, setPlace] = useState<PlaceState>({ postcode: "", suburb: "", state: "" });
  const [placeLoading, setPlaceLoading] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(
    null,
  );

  const callbackUrl = buildCallbackUrl(baseCallbackUrl, place);

  const handleUseMyLocation = async () => {
    setPlaceError(null);
    setPlaceLoading(true);
    try {
      const { postcode, suburb, state } = await getLocationAndPostcode();
      setPlace({ postcode, suburb, state });
    } catch (err) {
      setPlaceError(err instanceof Error ? err.message : "Could not get location");
    } finally {
      setPlaceLoading(false);
    }
  };

  const signInWithSocial = (provider: SocialProvider) => {
    setSocialLoading(provider);
    void signIn(provider, { callbackUrl });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2" role="group" aria-label="Sign in with social accounts">
        {SOCIAL_BUTTONS.map(({ provider, label }) => (
          <button
            key={provider}
            type="button"
            onClick={() => signInWithSocial(provider)}
            disabled={!!socialLoading || isLoading}
            aria-label={label}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            {socialLoading === provider ? "Redirecting…" : label}
          </button>
        ))}
      </div>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with email
          </span>
        </div>
      </div>

      <section aria-labelledby="login-place-heading" className="flex flex-col gap-3">
        <h3 id="login-place-heading" className="text-sm font-semibold text-foreground">
          {PLACE_LABEL} (optional)
        </h3>
        <p className="text-xs text-muted-foreground">
          Set a location to open the Provider Finder after sign-in.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={placeLoading || !!socialLoading || isLoading}
            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            aria-label="Use my location to set postcode and suburb"
          >
            {placeLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <MapPin className="h-4 w-4" aria-hidden />
            )}
            {placeLoading ? "Getting location…" : "Use my location"}
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
            Suburb
            <input
              type="text"
              value={place.suburb}
              onChange={(e) => setPlace((p) => ({ ...p, suburb: e.target.value }))}
              placeholder="Suburb"
              disabled={!!socialLoading || isLoading}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
            State
            <select
              value={place.state}
              onChange={(e) => setPlace((p) => ({ ...p, state: e.target.value }))}
              disabled={!!socialLoading || isLoading}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select</option>
              {AU_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
            Postcode
            <input
              type="text"
              value={place.postcode}
              onChange={(e) => setPlace((p) => ({ ...p, postcode: e.target.value }))}
              placeholder="Postcode"
              disabled={!!socialLoading || isLoading}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>
        </div>
        {placeError && (
          <p className="text-sm text-destructive" role="alert">
            {placeError}
          </p>
        )}
      </section>

      <form
        aria-labelledby="login-form-title"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setIsLoading(true);

          try {
            const result = await signIn("credentials", {
              email,
              password,
              redirect: false,
              callbackUrl,
            });

            if (result?.error) {
              setError("Invalid email or password");
              setIsLoading(false);
              return;
            }

            if (result?.ok === true) {
              setIsLoading(false);
              router.push(callbackUrl as string);
              router.refresh();
              return;
            }

            setError("An unexpected error occurred. Please try again.");
            setIsLoading(false);
          } catch {
            setError("An error occurred. Please try again.");
            setIsLoading(false);
          }
        }}
      >
        <div className="flex flex-col gap-3" role="group" aria-describedby="login-form-title">
          <h2 id="login-form-title" className="sr-only">
            Sign in with email
          </h2>
          <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
            Email address
            <input
              aria-required="true"
              placeholder="name@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
            Password
            <input
              aria-required="true"
              placeholder="Enter your password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 min-h-[44px]"
          >
            {isLoading ? "Signing in…" : "Sign in with email"}
          </button>
        </div>
      </form>
    </div>
  );
}

