"use client";

import { AuthForm } from "@/components/auth/auth-form";
import { useAuth } from "@/hooks/use-auth";
import { useSearchParams } from "next/navigation";

/**
 * Streamlined registration page using shared authentication utilities
 */
export default function RegisterPage() {
  const searchParams = useSearchParams();
  const { register, isLoading } = useAuth();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const handleRegister = async (data: {
    email: string;
    password: string;
    name?: string;
  }) => {
    if (!data.name) {
      return { success: false, error: "Name is required" };
    }
    return await register(
      { email: data.email, password: data.password, name: data.name },
      callbackUrl
    );
  };

  return (
    <AuthForm
      mode="register"
      onSubmit={handleRegister}
      isLoading={isLoading}
      callbackUrl={callbackUrl}
    />
  );
}
