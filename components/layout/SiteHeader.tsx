"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { APP_NAME, LOGO_PATH } from "@/lib/brand";
import { buildPath } from "@/lib/router";

export function SiteHeader() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && !!session?.user;
  const isLoading = status === "loading";

  return (
    <header
      className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      role="banner"
    >
      <div className="content-width flex flex-wrap items-center justify-between gap-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 font-heading text-lg font-bold text-primary hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
          aria-label={`${APP_NAME} home`}
        >
          <Image
            src={`/${LOGO_PATH}`}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
            unoptimized
          />
          <span>{APP_NAME}</span>
        </Link>
        <nav aria-label="Main" className="flex flex-wrap items-center gap-3 text-sm">
          <Link
            href={buildPath("providerFinder", {})}
            className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
          >
            Browse Library
          </Link>
          {isLoading ? (
            <span className="h-9 w-24 rounded-md bg-muted animate-pulse" aria-hidden />
          ) : isAuthenticated ? (
            <Link href={buildPath("dashboard", {})}>
              <Button variant="default" size="sm">
                Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link
                href={buildPath("login", {})}
                className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
              >
                Sign in
              </Link>
              <Link href={buildPath("register", {})}>
                <Button size="sm">Get Started</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
