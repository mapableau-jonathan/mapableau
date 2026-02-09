"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { type FC } from "react";

import { TopBarSearch } from "@/components/layout/TopBarSearch";
import { MapAbleLogo } from "@/components/MapAbleLogo";
import { Button } from "@/components/ui/button";
import { APP_NAME, LOGO_PATH, USE_LOGO_IMAGE } from "@/lib/brand";
import { buildPath } from "@/lib/router";
import { cn } from "@/lib/utils";

export type SiteHeaderProps = {
  onOpenLogin?: () => void;
  onOpenRegister?: () => void;
  /** topLite: brand + search + auth. default: same with glass. appBar: blue gradient, search pill + auth. */
  variant?: "topLite" | "default" | "appBar";
};

export const SiteHeader: FC<SiteHeaderProps> = ({ onOpenLogin, onOpenRegister, variant = "default" }) => {
  const isTopLite = variant === "topLite";
  const isAppBar = variant === "appBar";

  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && !!session?.user;
  const isLoading = status === "loading";

  const BrandLink = (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2.5 font-heading text-lg font-bold rounded-lg min-h-[44px] py-2 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isTopLite && "text-primary hover:opacity-90",
        isAppBar && "text-white hover:opacity-90 focus-visible:ring-white/50",
        variant === "default" && "text-primary hover:opacity-90",
      )}
    >
      {APP_NAME === "MapAble" && !USE_LOGO_IMAGE ? (
        <MapAbleLogo className="h-9 w-9 shrink-0 md:h-8 md:w-8" />
      ) : (
        <Image
          src={`/${LOGO_PATH}`}
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 object-contain md:h-8 md:w-8"
          unoptimized
        />
      )}
      <span className="hidden sm:inline">{APP_NAME}</span>
    </Link>
  );

  const AuthButtons = (
    <span className="inline-flex items-center gap-2 sm:gap-3">
      {isLoading ? (
        <span className={cn("h-9 w-24 rounded-xl animate-pulse", isAppBar ? "bg-white/20" : "bg-muted")} aria-hidden />
      ) : isAuthenticated ? (
        <Link href={buildPath("dashboard", {})}>
          <Button
            variant={isAppBar ? "secondary" : "default"}
            size="sm"
            className={cn(
              "rounded-xl font-semibold",
              isTopLite && "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md",
              isAppBar && "bg-white/20 text-white border-white/30 hover:bg-white/30",
            )}
          >
            Dashboard
          </Button>
        </Link>
      ) : (
        <>
          {onOpenLogin ? (
            <button
              type="button"
              onClick={onOpenLogin}
              className={cn(
                "rounded-xl px-4 py-2.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isTopLite && "text-foreground/85 hover:text-foreground hover:bg-accent/80",
                isAppBar && "text-white/90 hover:text-white hover:bg-white/10",
                variant === "default" && "text-muted-foreground hover:text-foreground hover:bg-accent/80",
              )}
            >
              Sign In
            </button>
          ) : (
            <Link
              href={buildPath("login", {})}
              className={cn(
                "rounded-xl px-4 py-2.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isTopLite && "text-foreground/85 hover:text-foreground hover:bg-accent/80",
                isAppBar && "text-white/90 hover:text-white hover:bg-white/10",
                variant === "default" && "text-muted-foreground hover:text-foreground hover:bg-accent/80",
              )}
            >
              Sign In
            </Link>
          )}
          {onOpenRegister ? (
            <Button
              size="sm"
              onClick={onOpenRegister}
              className={cn(
                "rounded-xl font-bold shadow-md",
                isTopLite && "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md",
                isAppBar && "bg-white/20 text-white border-white/30 hover:bg-white/30",
                variant === "default" && "",
              )}
              >
                Get Started
              </Button>
          ) : (
            <Link href={buildPath("register", {})}>
              <Button
                size="sm"
                className={cn(
                  "rounded-xl font-bold shadow-md",
                  isTopLite && "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md",
                  isAppBar && "bg-white/20 text-white border-white/30 hover:bg-white/30",
                  variant === "default" && "",
                )}
              >
                Get Started
              </Button>
            </Link>
          )}
        </>
      )}
    </span>
  );

  // --- topLite: brand + search + Sign In / Join ---
  if (isTopLite) {
    return (
      <header
        className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-md"
        role="banner"
      >
        <div className="content-width flex flex-wrap items-center gap-4 py-3">
          {BrandLink}
          <div className="flex-1 flex justify-center min-w-0 max-w-xl mx-2 md:mx-4">
            <TopBarSearch variant="default" className="w-full min-w-0 max-w-md" />
          </div>
          <nav aria-label="Account" className="flex items-center">
            {AuthButtons}
          </nav>
        </div>
      </header>
    );
  }

  // --- appBar: blue gradient, brand + search pill + auth (mockup Screen 1) ---
  if (isAppBar) {
    return (
      <header
        className="sticky top-0 z-50 border-b border-white/20 app-bar-bg"
        role="banner"
      >
        <div className="content-width flex flex-wrap items-center gap-4 py-3 md:py-4">
          <div>{BrandLink}</div>
          <div className="flex-1 flex justify-center min-w-0 max-w-xl mx-2 md:mx-4">
            <div className="w-full rounded-xl border border-white/40 bg-white/95 px-3 py-2 shadow-lg shadow-black/10 backdrop-blur-sm min-h-[42px] flex items-center">
              <TopBarSearch variant="appBar" embedded className="w-full min-w-0" />
            </div>
          </div>
          <nav aria-label="Account" className="flex items-center">
            {AuthButtons}
          </nav>
        </div>
      </header>
    );
  }

  // --- default: brand + search + auth (glass) ---
  return (
    <header
      className="sticky top-0 z-50 border-b border-border/80 glass shadow-glass"
      role="banner"
    >
      <div className="content-width flex flex-wrap items-center gap-4 py-3 md:py-4">
        {BrandLink}
        <div className="flex-1 flex justify-center min-w-0 max-w-xl mx-2 md:mx-4">
          <TopBarSearch variant="default" className="w-full min-w-0 max-w-md" />
        </div>
        <nav aria-label="Account" className="flex items-center">
          {AuthButtons}
        </nav>
      </div>
    </header>
  );
};
