import Link from "next/link";

import { SiteFooterAuthLinks } from "./SiteFooterAuthLinks";

const footerNav = [
  { href: "/", label: "Home" },
  { href: "/provider-finder", label: "Provider finder" },
  { href: "/map", label: "Map" },
  { href: "/dashboard", label: "Dashboard" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border/40 bg-gradient-to-br from-card via-card to-primary/5">
      <div className="container mx-auto px-4 py-10 sm:py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex max-w-sm flex-col gap-3">
            <div className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-primary/35 bg-background/80 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground"
                aria-hidden
              >
                Logo
              </span>
              <span className="font-heading text-base font-bold tracking-tight">
                MapableAU
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Discover NDIS providers, explore locations on the map, and manage
              your account from one place.
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground">Pages</p>
            <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-2">
              {footerNav.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm font-medium text-foreground/80 transition hover:text-primary"
                  >
                    {label}
                  </Link>
                </li>
              ))}
              <SiteFooterAuthLinks />
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-6xl border-t border-border/60 pt-6 text-center text-xs text-muted-foreground sm:text-left">
          © {new Date().getFullYear()} MapableAU. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
