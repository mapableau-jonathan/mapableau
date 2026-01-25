"use client";

import { signIn } from "next-auth/react";
import { Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface SocialLoginButtonsProps {
  callbackUrl?: string;
  isLoading?: boolean;
  serviceId?: "mapable" | "accessibooks" | "disapedia" | "mediawiki" | "cursor-replit";
}

function SocialLoginButtonsContent({
  callbackUrl = "/dashboard",
  isLoading = false,
  serviceId = "mapable",
}: SocialLoginButtonsProps) {
  const searchParams = useSearchParams();
  const serviceIdFromUrl = searchParams.get("serviceId") as SocialLoginButtonsProps["serviceId"];
  const finalServiceId = serviceIdFromUrl || serviceId;

  const handleSocialLogin = async (provider: "google" | "facebook" | "microsoft" | "wix") => {
    // Skip Wix - not implemented via Passport yet
    if (provider === "wix") {
      console.warn("Wix OAuth not yet implemented via Passport");
      return;
    }

    // Use Passport OAuth endpoints
    const baseUrl = window.location.origin;
    const authUrl = new URL(`/api/auth/${provider}`, baseUrl);
    
    // Optional: pass callback URL if needed
    if (callbackUrl && callbackUrl !== "/dashboard") {
      // Note: Callback URLs are handled server-side via default redirect
      // This could be extended to pass via query param if needed
    }

    // Redirect to OAuth provider
    window.location.href = authUrl.toString();
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSocialLogin("google")}
          disabled={isLoading}
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

        <Button
          type="button"
          variant="outline"
          onClick={() => handleSocialLogin("facebook")}
          disabled={isLoading}
          className="w-full"
          aria-label="Sign in with Facebook"
        >
          <Facebook className="h-5 w-5" />
          <span className="sr-only">Facebook</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => handleSocialLogin("microsoft")}
          disabled={isLoading}
          className="w-full"
          aria-label="Sign in with Microsoft"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 23 23"
            fill="currentColor"
            aria-hidden="true"
          >
            <path fill="#f25022" d="M0 0h11.377v11.372H0z" />
            <path fill="#00a4ef" d="M12.623 0H24v11.372H12.623z" />
            <path fill="#7fba00" d="M0 12.628h11.377V24H0z" />
            <path fill="#ffb900" d="M12.623 12.628H24V24H12.623z" />
          </svg>
          <span className="sr-only">Microsoft</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => handleSocialLogin("wix")}
          disabled={isLoading}
          className="w-full"
          aria-label="Sign in with Wix"
        >
          <span className="text-sm font-semibold">Wix</span>
          <span className="sr-only">Wix</span>
        </Button>
      </div>
    </div>
  );
}

export function SocialLoginButtons(props: SocialLoginButtonsProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SocialLoginButtonsContent {...props} />
    </Suspense>
  );
}
