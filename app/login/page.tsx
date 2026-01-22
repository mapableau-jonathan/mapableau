"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
          const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
            callbackUrl,
          });

          console.log("SignIn result:", result);
          console.log("Result ok:", result?.ok);
          console.log("Result error:", result?.error);
          console.log("Result url:", result?.url);

          if (result?.error) {
            setError("Invalid email or password");
            setIsLoading(false);
            return; // Prevent any further execution
          } else if (result?.ok === true) {
            // Success - redirect manually
            console.log("Login successful, redirecting to:", callbackUrl);
            setIsLoading(false);
            router.push(callbackUrl);
            router.refresh();
          } else {
            // Handle unexpected result
            console.error("Unexpected signIn result:", result);
            setError("An unexpected error occurred. Please try again.");
            setIsLoading(false);
          }
        } catch (error) {
          console.error("SignIn error:", error);
          setError("An error occurred. Please try again.");
          setIsLoading(false);
        }
      }}
    >
      <input
        placeholder="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={isLoading}
      />
      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        disabled={isLoading}
      />
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button type="submit" disabled={isLoading}>
        {isLoading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
