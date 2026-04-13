"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

import { cn } from "@/app/lib/utils";
import { Button } from "@/components/ui/button";

export function SiteHeaderAuth({ mobile }: { mobile?: boolean }) {
  const { status } = useSession();
  const loading = status === "loading";
  const authed = status === "authenticated";

  const wrap = mobile ? "w-full flex-col" : "flex-row";

  if (loading) {
    return (
      <div className={cn("flex gap-2", wrap)}>
        <div className="h-9 min-w-[5.5rem] animate-pulse rounded-lg bg-muted" />
        <div className="h-9 min-w-[5.5rem] animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (authed) {
    return (
      <div className={cn("flex gap-2", wrap)}>
        <Button
          variant="outline"
          size="sm"
          className={mobile ? "w-full" : undefined}
          type="button"
          onClick={() => void signOut({ callbackUrl: "/" })}
        >
          Log out
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-2", wrap)}>
      <Button
        variant="outline"
        size="sm"
        className={mobile ? "w-full" : undefined}
        asChild
      >
        <Link href="/login">Log in</Link>
      </Button>
      <Button
        variant="default"
        size="sm"
        className={mobile ? "w-full" : undefined}
        asChild
      >
        <Link href="/register">Register</Link>
      </Button>
    </div>
  );
}
