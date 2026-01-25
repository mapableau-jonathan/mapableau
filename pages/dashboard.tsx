/**
 * Dashboard Page
 * Shows user information from session
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { SessionUser } from "@/lib/session";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/me");

      if (response.status === 401) {
        // Not authenticated - redirect to login
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch user");
      }

      const data = await response.json();
      setUser(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load user");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", { method: "POST" });
      if (response.ok) {
        router.push("/login");
      }
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-red-600">Error: {error}</p>
        <a href="/login" className="text-blue-600 underline">
          Go to login
        </a>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Not authenticated</p>
        <a href="/login" className="text-blue-600 underline">
          Go to login
        </a>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Logout
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-2xl font-semibold mb-4">User Information</h2>

        <div>
          <label className="font-medium text-gray-700">Name:</label>
          <p className="text-gray-900">{user.name || "Not provided"}</p>
        </div>

        <div>
          <label className="font-medium text-gray-700">Email:</label>
          <p className="text-gray-900">{user.email || "Not provided"}</p>
        </div>

        <div>
          <label className="font-medium text-gray-700">Provider:</label>
          <p className="text-gray-900 capitalize">{user.provider}</p>
        </div>

        <div>
          <label className="font-medium text-gray-700">Roles:</label>
          <div className="flex gap-2 mt-1">
            {user.roles.map((role) => (
              <span
                key={role}
                className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
              >
                {role}
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="font-medium text-gray-700">Verification Status:</label>
          <p className="text-gray-900 capitalize">{user.verificationStatus}</p>
        </div>

        {user.linkedProviders && user.linkedProviders.length > 0 && (
          <div>
            <label className="font-medium text-gray-700">Linked Providers:</label>
            <div className="flex gap-2 mt-1">
              {user.linkedProviders.map((provider) => (
                <span
                  key={provider}
                  className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm capitalize"
                >
                  {provider}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
