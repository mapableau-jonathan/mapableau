"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { MapPin, Search, Filter, User, ChevronDown, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AccountShelf } from "@/components/account/account-shelf";
import { MAIN_NAV_ITEMS } from "@/lib/config/navigation";

/** Re-export for consumers that relied on NAV_ITEMS */
export const NAV_ITEMS = MAIN_NAV_ITEMS;

/**
 * Get user initials from name
 */
function getInitials(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function TopBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isAccountShelfOpen, setIsAccountShelfOpen] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  return (
    <>
      {/* Skip to main content (accessibility) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Skip to main content
      </a>

      {/* Main header and navigation */}
      <header
        className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-primary-logo to-primary-logo/90 text-primary-logo-foreground shadow-md"
        role="banner"
        aria-label="Site header and navigation"
      >
        <div className="container mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
            {/* Left: Logo + Nav (desktop) or Menu (mobile) */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Link
                href="/"
                className="flex items-center gap-1.5 sm:gap-2 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-logo rounded min-w-0"
                aria-label="MapAble Home"
              >
                <div className="bg-green-light rounded-lg p-1 sm:p-1.5 flex-shrink-0" aria-hidden>
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-white fill-white" />
                </div>
                <span className="font-heading text-lg sm:text-xl font-bold text-white truncate">
                  MapAble
                </span>
              </Link>

              {/* Desktop navigation */}
              <nav
                className="hidden md:flex items-center gap-1"
                aria-label="Main navigation"
              >
                {MAIN_NAV_ITEMS.map(({ label, href }) => {
                  const active = isActivePath(pathname ?? "", href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-logo ${
                        active
                          ? "text-white bg-white/20"
                          : "text-white/90 hover:text-white hover:bg-white/10"
                      }`}
                      aria-current={active ? "page" : undefined}
                    >
                      {label}
                    </Link>
                  );
                })}
              </nav>

              {/* Mobile menu button */}
              <Button
                variant="outline"
                size="icon"
                className="md:hidden bg-white/10 border-white/20 text-white hover:bg-white/20 h-9 w-9 flex-shrink-0"
                onClick={() => setIsNavOpen(true)}
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>

            {/* Center: Search - Hidden on mobile */}
            <div className="flex-1 max-w-2xl mx-2 sm:mx-4 hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search care, transport, jobs, places, supports..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  aria-label="Search MapAble services"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-accent rounded focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="Search options"
                >
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Right: Filters + Account */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* Filters Button - Hidden on mobile */}
              <Button
                variant="outline"
                size="default"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 hidden sm:flex"
                aria-label="Filters"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="ml-2 bg-white/20 rounded-full px-2 py-0.5 text-xs">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>

              {/* Account Button */}
              <Button
                variant="outline"
                size="default"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 h-9 sm:h-10 px-2 sm:px-4"
                onClick={() => setIsAccountShelfOpen(true)}
                aria-label="Account and sign in options"
                title="Sign in or manage your account"
              >
                {session?.user ? (
                  <>
                    <Avatar className="h-5 w-5 sm:h-6 sm:w-6 sm:mr-2 flex-shrink-0">
                      <AvatarImage
                        src={session.user.image || undefined}
                        alt={session.user.name || ""}
                      />
                      <AvatarFallback className="bg-white/20 text-white text-xs">
                        {getInitials(session.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline truncate max-w-[100px]">
                      {session.user.name?.split(" ")[0] || "Account"}
                    </span>
                  </>
                ) : (
                  <>
                    <User className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Log In</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Secondary Filter Bar - Hidden on mobile */}
        <div className="bg-slate-100/10 border-t border-white/10 hidden sm:block">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-4 h-10 text-sm">
              <button
                type="button"
                className="flex items-center gap-1 hover:bg-white/10 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary"
                aria-label="All categories"
              >
                All
                <ChevronDown className="h-3 w-3" />
              </button>
              <button
                type="button"
                className="flex items-center gap-1 hover:bg-white/10 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary"
                aria-label="Filter by location"
              >
                Location
                <ChevronDown className="h-3 w-3" />
              </button>
              <button
                type="button"
                className="flex items-center gap-1 hover:bg-white/10 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary"
                aria-label="Filter by category"
              >
                Category
                <ChevronDown className="h-3 w-3" />
              </button>
              <button
                type="button"
                className="ml-auto flex items-center gap-1 hover:bg-white/10 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary"
                aria-label="Filters"
              >
                <Filter className="h-3 w-3" />
                Filters
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Account Shelf */}
      <AccountShelf
        open={isAccountShelfOpen}
        onOpenChange={setIsAccountShelfOpen}
      />

      {/* Mobile navigation menu */}
      <Sheet open={isNavOpen} onOpenChange={setIsNavOpen}>
        <SheetContent
          side="left"
          className="w-[280px] sm:w-[300px] pt-10"
          aria-label="Navigation menu"
        >
          <SheetHeader>
            <SheetTitle className="sr-only">Navigation</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 mt-6" aria-label="Main navigation">
            {MAIN_NAV_ITEMS.map(({ label, href }) => {
              const active = isActivePath(pathname ?? "", href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsNavOpen(false)}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                    active
                      ? "bg-muted text-foreground"
                      : "text-foreground hover:bg-muted"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
