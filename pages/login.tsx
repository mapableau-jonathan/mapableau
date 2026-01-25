/**
 * Login Page
 * Shows login buttons for OAuth providers (non-functional for now)
 * Includes dev-only session seeding button
 */

import { useRouter } from "next/router";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSeedSession = async () => {
    setSeeding(true);
    setError(null);

    try {
      const response = await fetch("/api/dev/seed-session", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to seed session");
      }

      // Redirect to dashboard after successful seed
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to seed session");
      setSeeding(false);
    }
  };

  const isDev = process.env.NODE_ENV !== "production";

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-center mb-2">Log in</h1>
          <p className="text-center text-gray-600">Sign in to MapAble</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {/* OAuth Provider Buttons (non-functional for now) */}
          <a
            href="/api/auth/google"
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 no-underline"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span>Sign in with Google</span>
          </a>

          <a
            href="/api/auth/microsoft"
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 no-underline"
          >
            <svg className="w-5 h-5" viewBox="0 0 23 23" fill="currentColor">
              <path fill="#f25022" d="M0 0h11.377v11.372H0z" />
              <path fill="#00a4ef" d="M12.623 0H24v11.372H12.623z" />
              <path fill="#7fba00" d="M0 12.628h11.377V24H0z" />
              <path fill="#ffb900" d="M12.623 12.628H24V24H12.623z" />
            </svg>
            <span>Sign in with Microsoft</span>
          </a>

          <a
            href="/api/auth/facebook"
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 no-underline"
          >
            <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            <span>Sign in with Facebook</span>
          </a>
        </div>

        {/* Dev-only session seeding button */}
        {isDev && (
          <div className="pt-4 border-t">
            <p className="text-xs text-gray-500 mb-3 text-center">
              Development Only
            </p>
            <button
              type="button"
              onClick={handleSeedSession}
              disabled={seeding}
              className="w-full px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {seeding ? "Seeding session..." : "Seed Dev Session"}
            </button>
          </div>
        )}

        <div className="text-center text-sm text-gray-600">
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
