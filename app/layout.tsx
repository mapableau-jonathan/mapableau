import "@/app/index.css";

import { BrandProvider } from "@/app/contexts/BrandContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <BrandProvider>{children}</BrandProvider>
      </body>
    </html>
  );
}
