import "@/app/index.css";
import "leaflet/dist/leaflet.css";
import { SessionProvider } from "next-auth/react";

import { BrandProvider } from "@/app/contexts/BrandContext";
import { QueryProvider } from "@/lib/query-provider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <QueryProvider>
            <BrandProvider>{children}</BrandProvider>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
