"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Accessibility,
  Facebook,
  Volume2,
  Settings,
  ArrowRight,
  Mail,
  Lock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LoginTabProps {
  onClose: () => void;
  onSwitchToRegister?: () => void;
}

export function LoginTab({ onClose, onSwitchToRegister }: LoginTabProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("We couldn't sign you in. Please check your email and password.");
      } else if (result?.ok) {
        onClose();
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth0Login = () => {
    // NextAuth will handle the redirect
    // Error -102 typically means callback URL mismatch in Auth0 Dashboard
    signIn("auth0", {
      callbackUrl: window.location.href,
    }).catch((error) => {
      console.error("Auth0 login error:", error);
      setError(
        "Unable to connect to Australian Disability Ltd. Please check that the callback URL is configured in Auth0 Dashboard: " +
          `${window.location.origin}/api/auth/callback/auth0`
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <h2 className="text-2xl font-bold text-primary">Welcome to MapAble!</h2>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email or Username
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
              aria-label="Email or Username"
              aria-describedby={error ? "login-error" : undefined}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-sm text-primary hover:underline"
              onClick={onClose}
            >
              Forgot Password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              required
              aria-label="Password"
              aria-describedby={error ? "login-error" : undefined}
            />
          </div>
        </div>

        {error && (
          <div
            id="login-error"
            className="text-sm text-destructive bg-destructive/10 p-3 rounded-md"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}

        <Button
          type="submit"
          variant="default"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? "Signing in..." : "Log In"}
        </Button>
      </form>

      {/* OAuth Section */}
      <div className="space-y-4">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => signIn("facebook")}
            className="w-full"
            aria-label="Sign in with Facebook"
          >
            <Facebook className="h-5 w-5" />
            <span className="sr-only">Facebook</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => signIn("google")}
            className="w-full"
            aria-label="Sign in with Google"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span className="sr-only">Google</span>
          </Button>

          {/* Apple Sign In */}
          <Button
            type="button"
            variant="outline"
            onClick={() => signIn("apple")}
            className="w-full"
            aria-label="Sign in with Apple"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            <span className="sr-only">Apple</span>
          </Button>

          {/* Auth0 for Australian Disability Ltd - Organizational Launchpad */}
          <Button
            type="button"
            variant="outline"
            onClick={handleAuth0Login}
            className="w-full"
            aria-label="Sign in with Australian Disability Ltd"
          >
            <span className="text-sm font-semibold">AD Ltd</span>
            <span className="sr-only">Australian Disability Ltd</span>
          </Button>
        </div>
      </div>

      {/* Registration Link */}
      <div className="text-center text-sm">
        <span className="text-muted-foreground">Need an account? </span>
        <button
          type="button"
          className="text-primary hover:underline font-medium"
          onClick={onSwitchToRegister}
        >
          Join now!
        </button>
      </div>

      {/* Accessibility Help – consistent Accessibility icon (logo blue) */}
      <div className="space-y-2 pt-4 border-t">
        <button
          type="button"
          onClick={() => {
            onClose();
            router.push("/accessibility/screen-reader-guide");
          }}
          className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors group focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Screen Reader Guide"
        >
          <div className="flex items-center gap-3">
            <Accessibility className="h-5 w-5 text-primary-logo shrink-0" aria-hidden />
            <span className="text-sm font-medium">Screen Reader Guide</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            router.push("/accessibility/settings");
          }}
          className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors group focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Adjust Text Size and Contrast"
        >
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">
              Adjust Text Size / Contrast
            </span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
        </button>
      </div>
    </div>
  );
}
