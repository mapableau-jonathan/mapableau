import "@/app/index.css";
import "leaflet/dist/leaflet.css";

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
        <QueryProvider>
          <BrandProvider>{children}</BrandProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
