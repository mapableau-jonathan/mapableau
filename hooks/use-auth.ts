"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import type { LoginData, RegisterData } from "@/lib/auth-utils";
import {
  registerUser,
  validateLoginData,
  validateRegisterData,
} from "@/lib/auth-utils";

interface UseAuthReturn {
  // Session state
  session: ReturnType<typeof useSession>["data"];
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (data: LoginData, callbackUrl?: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  register: (data: RegisterData, callbackUrl?: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  logout: () => Promise<void>;
}

/**
 * Streamlined authentication hook
 * Provides unified login, register, and logout functionality
 */
export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const login = useCallback(
    async (
      data: LoginData,
      callbackUrl = "/dashboard"
    ): Promise<{ success: boolean; error?: string }> => {
      setIsProcessing(true);

      // Validate input
      const validation = validateLoginData(data);
      if (!validation.valid) {
        setIsProcessing(false);
        return {
          success: false,
          error: validation.errors[0]?.message || "Invalid input",
        };
      }

      try {
        const result = await signIn("credentials", {
          email: data.email,
          password: data.password,
          redirect: false,
          callbackUrl,
        });

        if (result?.error) {
          setIsProcessing(false);
          return {
            success: false,
            error: "Invalid email or password",
          };
        }

        if (result?.ok) {
          router.push(callbackUrl);
          router.refresh();
          return { success: true };
        }

        setIsProcessing(false);
        return {
          success: false,
          error: "An unexpected error occurred",
        };
      } catch (error) {
        setIsProcessing(false);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Login failed",
        };
      }
    },
    [router]
  );

  const register = useCallback(
    async (
      data: RegisterData,
      callbackUrl = "/dashboard"
    ): Promise<{ success: boolean; error?: string }> => {
      setIsProcessing(true);

      // Validate input
      const validation = validateRegisterData(data);
      if (!validation.valid) {
        setIsProcessing(false);
        return {
          success: false,
          error: validation.errors[0]?.message || "Invalid input",
        };
      }

      try {
        // Register user
        const registerResult = await registerUser(data);
        if (!registerResult.success) {
          setIsProcessing(false);
          return registerResult;
        }

        // Automatically sign in after registration
        const signInResult = await signIn("credentials", {
          email: data.email,
          password: data.password,
          redirect: false,
          callbackUrl,
        });

        if (signInResult?.error) {
          setIsProcessing(false);
          return {
            success: false,
            error: "Registration successful, but sign-in failed. Please try logging in.",
          };
        }

        if (signInResult?.ok) {
          router.push(callbackUrl);
          router.refresh();
          return { success: true };
        }

        setIsProcessing(false);
        return {
          success: false,
          error: "An unexpected error occurred",
        };
      } catch (error) {
        setIsProcessing(false);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Registration failed",
        };
      }
    },
    [router]
  );

  const logout = useCallback(async (): Promise<void> => {
    await signOut({ redirect: true, callbackUrl: "/login" });
  }, []);

  return {
    session,
    isLoading: status === "loading" || isProcessing,
    isAuthenticated: !!session,
    login,
    register,
    logout,
  };
}
