"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

import { PLACE_LABEL } from "@/lib/place";
import { parseResponseJson } from "@/lib/utils";

const AU_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"] as const;

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [suburb, setSuburb] = useState("");
  const [state, setState] = useState("");
  const [postcode, setPostcode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

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
        return;
      }

      // Automatically sign in after registration
      await signIn("credentials", {
        email,
        password,
        callbackUrl: "/dashboard",
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto mt-10 flex max-w-md flex-col gap-4"
    >
      <div>
        <label htmlFor="register-name" className="mb-1 block text-sm font-medium text-foreground">
          Name
        </label>
        <input
          id="register-name"
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label htmlFor="register-email" className="mb-1 block text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="register-email"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label htmlFor="register-password" className="mb-1 block text-sm font-medium text-foreground">
          Password
        </label>
        <input
          id="register-password"
          type="password"
          placeholder="At least 8 characters, with a letter and number"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <section aria-labelledby="register-place-heading">
        <h3 id="register-place-heading" className="mb-3 text-sm font-semibold text-foreground">
          {PLACE_LABEL} (optional)
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="register-suburb" className="mb-1 block text-sm font-medium text-foreground">
              Suburb
            </label>
            <input
              id="register-suburb"
              type="text"
              value={suburb}
              onChange={(e) => setSuburb(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="register-state" className="mb-1 block text-sm font-medium text-foreground">
              State
            </label>
            <select
              id="register-state"
              value={state}
              onChange={(e) => setState(e.target.value)}
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
            <label htmlFor="register-postcode" className="mb-1 block text-sm font-medium text-foreground">
              Postcode
            </label>
            <input
              id="register-postcode"
              type="text"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
        className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Register
      </button>
    </form>
  );
}
