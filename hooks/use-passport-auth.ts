/**
 * Passport Authentication Hook
 * Client-side hook for using the centralized Passport authentication system
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  image?: string;
  serviceAccess?: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface UsePassportAuthReturn {
  // State
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  verifyToken: () => Promise<boolean>;
}

/**
 * Hook for Passport authentication
 */
export function usePassportAuth(): UsePassportAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Load user from token on mount
  useEffect(() => {
    verifyToken();
  }, []);

  /**
   * Login with email and password
   */
  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/auth/passport/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Login failed");
          setIsLoading(false);
          return { success: false, error: data.error || "Login failed" };
        }

        // Store tokens
        if (data.tokens) {
          localStorage.setItem("access_token", data.tokens.accessToken);
          localStorage.setItem("refresh_token", data.tokens.refreshToken);
        }

        setUser(data.user);
        setIsLoading(false);
        return { success: true };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Login failed";
        setError(errorMessage);
        setIsLoading(false);
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  /**
   * Logout user
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      await fetch("/api/auth/passport/logout", {
        method: "POST",
      });

      // Clear tokens
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");

      setUser(null);
      router.push("/login");
    } catch (err) {
      console.error("Logout error:", err);
      // Clear tokens anyway
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      setUser(null);
      router.push("/login");
    }
  }, [router]);

  /**
   * Refresh access token
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    const refreshTokenValue = localStorage.getItem("refresh_token");

    if (!refreshTokenValue) {
      setUser(null);
      setIsLoading(false);
      return false;
    }

    try {
      const response = await fetch("/api/auth/passport/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refreshTokenValue }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Refresh failed, clear tokens
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        setUser(null);
        setIsLoading(false);
        return false;
      }

      // Update tokens
      if (data.tokens) {
        localStorage.setItem("access_token", data.tokens.accessToken);
        localStorage.setItem("refresh_token", data.tokens.refreshToken);
      }

      return true;
    } catch (err) {
      console.error("Token refresh error:", err);
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      setUser(null);
      setIsLoading(false);
      return false;
    }
  }, []);

  /**
   * Verify current token
   */
  const verifyToken = useCallback(async (): Promise<boolean> => {
    const accessToken = localStorage.getItem("access_token");

    if (!accessToken) {
      setIsLoading(false);
      return false;
    }

    try {
      const response = await fetch("/api/auth/passport/verify", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        // Token invalid, try to refresh
        const refreshed = await refreshToken();
        if (!refreshed) {
          setIsLoading(false);
          return false;
        }
        // Retry verification after refresh
        return verifyToken();
      }

      setUser(data.user);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error("Token verification error:", err);
      setIsLoading(false);
      return false;
    }
  }, [refreshToken]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    login,
    logout,
    refreshToken,
    verifyToken,
  };
}

/**
 * Get access token from storage
 */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

/**
 * Create authenticated fetch with token
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAccessToken();

  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
