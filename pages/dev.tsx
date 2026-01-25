/**
 * Dev Test Page
 * Test page for role-based access control
 * Only visible in development
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSessionUser } from "@/lib/ui/useSessionUser";
import { Role, VerificationStatus } from "@/lib/auth/types";

export default function DevPage() {
  const router = useRouter();
  const { user, loading, error, refetch } = useSessionUser();
  const [results, setResults] = useState<Record<string, any>>({});
  const [updating, setUpdating] = useState(false);

  // Only show in development
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      router.push("/");
    }
  }, [router]);

  const updateSession = async (roles: Role[], verificationStatus?: VerificationStatus) => {
    setUpdating(true);
    try {
      const response = await fetch("/api/dev/set-session", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roles,
          verificationStatus,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        refetch();
        setResults((prev) => ({
          ...prev,
          "set-session": { success: true, data },
        }));
      } else {
        setResults((prev) => ({
          ...prev,
          "set-session": { success: false, error: data },
        }));
      }
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        "set-session": { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      }));
    } finally {
      setUpdating(false);
    }
  };

  const testEndpoint = async (endpoint: string, name: string) => {
    try {
      const response = await fetch(endpoint, {
        credentials: "include",
      });

      const data = await response.json();
      setResults((prev) => ({
        ...prev,
        [name]: {
          success: response.ok,
          status: response.status,
          data,
        },
      }));
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [name]: {
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        },
      }));
    }
  };

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-red-600">Error: {error || "Not authenticated"}</p>
        <p className="mt-4">
          <a href="/api/dev/seed-session" className="text-blue-600 underline">
            Seed a session first
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">RBAC Dev Test Page</h1>

      {/* Current Session User */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">Current Session User</h2>
        <div className="space-y-2">
          <p>
            <strong>ID:</strong> {user.id}
          </p>
          <p>
            <strong>Email:</strong> {user.email || "Not provided"}
          </p>
          <p>
            <strong>Name:</strong> {user.name || "Not provided"}
          </p>
          <p>
            <strong>Provider:</strong> {user.provider || "Not provided"}
          </p>
          <p>
            <strong>Roles:</strong> {user.roles?.join(", ") || "None"}
          </p>
          <p>
            <strong>Verification Status:</strong> {user.verificationStatus || "unverified"}
          </p>
        </div>
      </div>

      {/* Role Switcher */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">Change Role</h2>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => updateSession(["participant"], "unverified")}
            disabled={updating}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Set: Participant (unverified)
          </button>

          <button
            onClick={() => updateSession(["worker"], "unverified")}
            disabled={updating}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            Set: Worker (unverified)
          </button>

          <button
            onClick={() => updateSession(["worker"], "verified")}
            disabled={updating}
            className="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800 disabled:opacity-50"
          >
            Set: Worker (verified)
          </button>

          <button
            onClick={() => updateSession(["platform_admin"], "verified")}
            disabled={updating}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            Set: Platform Admin
          </button>
        </div>
      </div>

      {/* Test Endpoints */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">Test Protected Endpoints</h2>
        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={() => testEndpoint("/api/admin/ping", "admin-ping")}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            GET /api/admin/ping
          </button>

          <button
            onClick={() => testEndpoint("/api/worker/ping", "worker-ping")}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            GET /api/worker/ping
          </button>

          <button
            onClick={() => testEndpoint("/api/worker/verified-ping", "verified-ping")}
            className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
          >
            GET /api/worker/verified-ping
          </button>
        </div>
      </div>

      {/* Results */}
      {Object.keys(results).length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">Results</h2>
          <div className="space-y-4">
            {Object.entries(results).map(([key, result]) => (
              <div
                key={key}
                className={`p-4 rounded ${
                  result.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                }`}
              >
                <h3 className="font-semibold mb-2">{key}</h3>
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
