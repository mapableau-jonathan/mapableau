import "@/app/index.css";
import "leaflet/dist/leaflet.css";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";

import { Providers } from "@/app/Providers";
import { APP_DESCRIPTION, APP_NAME, LOGO_PATH } from "@/lib/brand";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});
const heading = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata = {
  title: `${APP_NAME} – Your Online Accessible Library`,
  description: APP_DESCRIPTION,
  icons: {
    icon: `/${LOGO_PATH}`,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${heading.variable}`}>
      <body className="bg-background text-foreground antialiased font-sans">
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <a className="skip-link" href="#main-nav">
          Skip to navigation
        </a>
        <a className="skip-link" href="#footer">
          Skip to footer
        </a>
        <Providers>
          <div className="flex min-h-screen flex-col" id="page-root">
            <main
              id="main-content"
              className="flex-1"
              role="main"
              tabIndex={-1}
              aria-label="Main content"
            >
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
