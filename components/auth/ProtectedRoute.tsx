/**
 * Protected Route Component
 * UI guard for protecting routes based on authentication and roles
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredAuth?: boolean;
  requiredRoles?: string[];
  redirectTo?: string;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  requiredAuth = true,
  requiredRoles = [],
  redirectTo = "/login",
  fallback,
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth();
  }, [pathname]);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/passport/session");
      
      if (!response.ok) {
        if (requiredAuth) {
          router.push(`${redirectTo}?callback=${encodeURIComponent(pathname)}`);
          return;
        }
        setIsAuthorized(true); // Allow if auth not required
        return;
      }

      const session = await response.json();

      if (requiredAuth && !session.isLoggedIn) {
        router.push(`${redirectTo}?callback=${encodeURIComponent(pathname)}`);
        return;
      }

      // Check roles if required
      if (requiredRoles.length > 0) {
        const hasRole = requiredRoles.includes(session.role || "");
        if (!hasRole) {
          router.push("/dashboard?error=insufficient_permissions");
          return;
        }
      }

      setIsAuthorized(true);
    } catch (error) {
      console.error("Auth check error:", error);
      if (requiredAuth) {
        router.push(redirectTo);
      } else {
        setIsAuthorized(true);
      }
    }
  };

  if (isAuthorized === null) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen" role="status" aria-live="polite">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
