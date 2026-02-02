import "@/app/index.css";

import { BrandProvider } from "@/app/contexts/BrandContext";
import { SessionProvider } from "@/components/providers/session-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { TopBar } from "@/components/layout/topbar";
import { AppBreadcrumbs } from "@/components/layout/breadcrumbs";
import { PageWithSidebar } from "@/components/layout/page-with-sidebar";
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
            <BrandProvider>
              <TopBar />
              <main
                id="main-content"
                className="pt-14 sm:pt-28"
                tabIndex={-1}
              >
                <div className="container mx-auto px-4 py-3 sm:px-6">
                  <AppBreadcrumbs hideOnHome className="mb-3" />
                  <PageWithSidebar className="mt-3">
                    {children}
                  </PageWithSidebar>
                </div>
              </main>
            </BrandProvider>
          </SessionProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
