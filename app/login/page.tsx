import { Suspense } from "react";

import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <div className="container mx-auto px-4 py-10">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <LoginClient />
      </Suspense>
    </div>
  );
}
