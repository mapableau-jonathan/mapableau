import { Menu } from "lucide-react";
import Link from "next/link";

import { cn } from "@/app/lib/utils";

import { SiteHeaderAuth } from "./SiteHeaderAuth";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/provider-finder", label: "Provider finder" },
  { href: "/dashboard", label: "Dashboard" },
] as const;

function NavLinks({ className }: { className?: string }) {
  return (
    <nav
      className={cn(
        "flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-1",
        className,
      )}
    >
      {navLinks.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-card/85 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-card/70">
      <div className="container mx-auto px-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 py-3">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-3 rounded-xl outline-none ring-offset-background transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-primary/35 bg-gradient-to-br from-card via-card to-primary/5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
              aria-hidden
            >
              Logo
            </span>
            <span className="truncate font-heading text-lg font-bold tracking-tight text-foreground">
              MapableAU
            </span>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            <NavLinks className="mr-2" />
            <SiteHeaderAuth />
          </div>

          <details className="relative md:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-center rounded-lg border border-input bg-background p-2 text-muted-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground [&::-webkit-details-marker]:hidden">
              <span className="sr-only">Open menu</span>
              <Menu className="h-5 w-5" aria-hidden />
            </summary>
            <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-border/60 bg-card p-2 shadow-lg">
              <NavLinks />
              <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
                <SiteHeaderAuth mobile />
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
