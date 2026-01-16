"use client";

import { AuthForm } from "@/components/auth/auth-form";
import { useAuth } from "@/hooks/use-auth";
import { useSearchParams } from "next/navigation";
import { ErrorBoundary } from "@/components/error-boundary";

/**
 * Streamlined login page using shared authentication utilities
 */
export default function LoginPage() {
  const searchParams = useSearchParams();
  const { login, isLoading } = useAuth();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const handleLogin = async (data: {
    email: string;
    password: string;
  }) => {
    return await login(
      { email: data.email, password: data.password },
      callbackUrl
    );
  };

  return (
    <ErrorBoundary>
      <AuthForm
        mode="login"
        onSubmit={handleLogin}
        isLoading={isLoading}
        callbackUrl={callbackUrl}
      />
    </ErrorBoundary>
  );
}
