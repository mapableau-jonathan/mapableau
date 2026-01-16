"use client";

import Link from "next/link";
import { useState } from "react";
import { SocialLoginButtons } from "./social-login-buttons";

interface AuthFormProps {
  mode: "login" | "register";
  onSubmit: (data: {
    email: string;
    password: string;
    name?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  isLoading?: boolean;
  error?: string;
  callbackUrl?: string;
}

/**
 * Reusable authentication form component
 * Streamlined form for both login and registration
 */
export function AuthForm({
  mode,
  onSubmit,
  isLoading = false,
  error: externalError,
  callbackUrl,
}: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    setIsSubmitting(true);
    const result = await onSubmit({
      email,
      password,
      ...(mode === "register" && { name }),
    });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || "An error occurred");
    }
  };

  const displayError = error || externalError;
  const isProcessing = isLoading || isSubmitting;

  return (
    <div className="max-w-md mx-auto mt-10 flex flex-col gap-4">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold">
          {mode === "login" ? "Sign in" : "Register"}
        </h1>
      </div>

      <SocialLoginButtons callbackUrl={callbackUrl} isLoading={isProcessing} />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {mode === "register" && (
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isProcessing}
            className="px-4 py-2 border rounded disabled:opacity-50"
          />
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isProcessing}
          className="px-4 py-2 border rounded disabled:opacity-50"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isProcessing}
          className="px-4 py-2 border rounded disabled:opacity-50"
        />

        {displayError && (
          <p className="text-red-500 text-sm">{displayError}</p>
        )}

        <button
          type="submit"
          disabled={isProcessing}
          className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing
            ? mode === "login"
              ? "Signing in..."
              : "Registering..."
            : mode === "login"
              ? "Sign in"
              : "Register"}
        </button>
      </form>

      <div className="text-center text-sm text-gray-600">
        {mode === "login" ? (
          <>
            Don't have an account?{" "}
            <Link
              href={`/register${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
              className="text-blue-600 hover:underline"
            >
              Register here
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link
              href={`/login${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
              className="text-blue-600 hover:underline"
            >
              Sign in here
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
