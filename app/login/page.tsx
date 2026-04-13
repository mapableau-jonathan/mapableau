import { Suspense } from "react";

import LoginClient from "./LoginClient";
import { LoginFallback } from "./LoginFallback";

export default function LoginPage() {
  return (
    <div className="bg-background py-12">
      <section className="container mx-auto px-4">
        <div className="mx-auto max-w-lg">
          <Suspense fallback={<LoginFallback />}>
            <LoginClient />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
