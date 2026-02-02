"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/app/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  /** Separator between items (default: ChevronRight) */
  separator?: React.ReactNode;
}

/**
 * Accessible breadcrumb navigation (WCAG: aria-label, current page aria-current="page").
 */
export function Breadcrumb({ items, className, separator }: BreadcrumbProps) {
  if (!items.length) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1 text-sm text-muted-foreground", className)}
    >
      <ol className="flex flex-wrap items-center gap-1 list-none p-0 m-0 [&>li]:inline-flex [&>li]:items-center [&>li]:gap-1">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const sep = separator ?? <ChevronRight className="h-4 w-4" />;

          return (
            <React.Fragment key={`${item.href}-${i}`}>
              {i > 0 ? (
                <li className="shrink-0 text-muted-foreground/70 mx-0.5" aria-hidden>
                  {sep}
                </li>
              ) : null}
              <li>
                {isLast ? (
                  <span
                    aria-current="page"
                    className="font-medium text-foreground truncate max-w-[200px] sm:max-w-none"
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="truncate max-w-[120px] sm:max-w-[200px] hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded px-0.5 -mx-0.5"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
