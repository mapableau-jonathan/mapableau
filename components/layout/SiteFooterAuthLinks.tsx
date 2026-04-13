"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

export function SiteFooterAuthLinks() {
  const { status } = useSession();

  const linkClass =
    "text-sm font-medium text-foreground/80 transition hover:text-primary";

  if (status === "loading") {
    return (
      <>
        <li>
          <span className="block h-4 w-14 animate-pulse rounded bg-muted" />
        </li>
        <li>
          <span className="block h-4 w-16 animate-pulse rounded bg-muted" />
        </li>
      </>
    );
  }

  if (status === "authenticated") {
    return (
      <li className="col-span-2 sm:col-span-1">
        <button
          type="button"
          className={linkClass}
          onClick={() => void signOut({ callbackUrl: "/" })}
        >
          Log out
        </button>
      </li>
    );
  }

  return (
    <>
      <li>
        <Link href="/login" className={linkClass}>
          Log in
        </Link>
      </li>
      <li>
        <Link href="/register" className={linkClass}>
          Register
        </Link>
      </li>
    </>
  );
}
