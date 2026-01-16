import "@/app/index.css";

import { BrandProvider } from "@/app/contexts/BrandContext";
import { SessionProvider } from "@/components/providers/session-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { initEnv } from "@/lib/config/env";

// Initialize environment validation
if (typeof window === "undefined") {
  initEnv();
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <SessionProvider>
            <BrandProvider>{children}</BrandProvider>
          </SessionProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
