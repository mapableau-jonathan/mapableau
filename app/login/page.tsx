import { Suspense } from "react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <div className="page-inner flex-1 flex flex-col justify-center max-w-md mx-auto">
        <h1 className="text-2xl font-heading font-bold text-foreground mb-2">Sign in</h1>
        <p className="text-muted-foreground text-sm mb-6">Sign in to your account to continue.</p>
        <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
          <LoginClient />
        </Suspense>
      </div>
    </div>
  );
}
