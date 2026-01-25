/**
 * Client-side hook to fetch current session user
 * Fetches from /api/me with credentials included
 */

import { useState, useEffect } from "react";
import { SessionUser } from "@/lib/auth/types";

export function useSessionUser() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/me", {
          credentials: "include",
        });

        if (response.status === 401) {
          setUser(null);
          setLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to fetch user");
        }

        const data = await response.json();
        setUser(data.user);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch user");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const refetch = () => {
    fetch("/api/me", { credentials: "include" })
      .then((res) => {
        if (res.status === 401) {
          setUser(null);
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          setError(null);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to fetch user"));
  };

  return { user, loading, error, refetch };
}
