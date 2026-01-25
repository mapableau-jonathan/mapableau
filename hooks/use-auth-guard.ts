/**
 * Auth Guard Hook
 * Client-side hook for protecting routes and checking permissions
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AuthState {
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    name?: string;
    role?: string;
  } | null;
  loading: boolean;
}

export function useAuthGuard(options?: {
  redirectTo?: string;
  requiredRoles?: string[];
}) {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/passport/session");
      
      if (!response.ok) {
        setAuthState({
          isAuthenticated: false,
          user: null,
          loading: false,
        });

        if (options?.redirectTo) {
          router.push(options.redirectTo);
        }
        return;
      }

      const session = await response.json();

      if (!session.isLoggedIn) {
        setAuthState({
          isAuthenticated: false,
          user: null,
          loading: false,
        });

        if (options?.redirectTo) {
          router.push(options.redirectTo);
        }
        return;
      }

      // Check roles if required
      if (options?.requiredRoles && options.requiredRoles.length > 0) {
        const hasRole = options.requiredRoles.includes(session.role || "");
        if (!hasRole) {
          setAuthState({
            isAuthenticated: false,
            user: null,
            loading: false,
          });
          router.push("/dashboard?error=insufficient_permissions");
          return;
        }
      }

      setAuthState({
        isAuthenticated: true,
        user: {
          id: session.userId,
          email: session.email || "",
          name: session.name,
          role: session.role,
        },
        loading: false,
      });
    } catch (error) {
      console.error("Auth check error:", error);
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
      });
    }
  };

  return authState;
}
