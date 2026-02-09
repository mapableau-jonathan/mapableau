"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

import { PLACE_LABEL } from "@/lib/place";
import { parseResponseJson } from "@/lib/utils";

import { Button } from "@/components/ui/button";

const AU_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"] as const;

type RegisterFormProps = {
  /** Called after successful registration (before redirect). */
  onSuccess?: () => void;
  /** Tighter layout for use inside a floating panel. */
  compact?: boolean;
};

export function RegisterForm({ onSuccess, compact }: RegisterFormProps) {
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
      const res = await fetch("/api/register", {
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

      const data = await parseResponseJson<{ error?: string }>(res);

      if (!res.ok) {
        setError(data?.error || "Registration failed");
        setIsLoading(false);
        return;
      }

      onSuccess?.();

      await signIn("credentials", {
        email,
        password,
        callbackUrl: "/dashboard",
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  const gapClass = compact ? "gap-3" : "gap-4";
  const inputClass =
    "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <form onSubmit={handleSubmit} className={`flex flex-col ${gapClass}`} aria-labelledby="register-form-title">
      <h2 id="register-form-title" className="sr-only">
        Create account
      </h2>
      <label htmlFor="register-name" className="flex flex-col gap-1 text-sm font-medium text-foreground">
        Name
        <input
          id="register-name"
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={isLoading}
          className={inputClass}
        />
      </label>
      <label htmlFor="register-email" className="flex flex-col gap-1 text-sm font-medium text-foreground">
        Email
        <input
          id="register-email"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
          className={inputClass}
        />
      </label>
      <label htmlFor="register-password" className="flex flex-col gap-1 text-sm font-medium text-foreground">
        Password
        <input
          id="register-password"
          type="password"
          placeholder="At least 8 characters, with a letter and number"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          disabled={isLoading}
          className={inputClass}
        />
      </label>
      <section aria-labelledby="register-place-heading">
        <h3 id="register-place-heading" className={compact ? "mb-2 text-xs font-semibold text-foreground" : "mb-3 text-sm font-semibold text-foreground"}>
          {PLACE_LABEL} (optional)
        </h3>
        <div className={`grid gap-3 sm:grid-cols-3 ${compact ? "gap-2" : ""}`}>
          <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
            Suburb
            <input
              id="register-suburb"
              type="text"
              value={suburb}
              onChange={(e) => setSuburb(e.target.value)}
              disabled={isLoading}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
            State
            <select
              id="register-state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              disabled={isLoading}
              className={inputClass}
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
              id="register-postcode"
              type="text"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              disabled={isLoading}
              className={inputClass}
            />
          </label>
        </div>
      </section>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
