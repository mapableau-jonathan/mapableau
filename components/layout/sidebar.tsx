"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getSectionMenu } from "@/lib/config/navigation";
import { cn } from "@/app/lib/utils";

export interface SidebarProps {
  className?: string;
  /** Optional title above the section menu (e.g. "Care" when on /care) */
  title?: string;
}

/**
 * Renders a section sub-menu when the current path matches a configured section (e.g. Care, Admin).
 * Use inside a layout or page that should show a sidebar.
 */
export function Sidebar({ className, title }: SidebarProps) {
  const pathname = usePathname();
  const menu = pathname ? getSectionMenu(pathname) : null;

  if (!menu?.length) return null;

  return (
    <aside
      className={cn("w-full", className)}
      role="navigation"
      aria-label="Section menu"
    >
      {title && (
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-2">
          {title}
        </h2>
      )}
      <nav className="flex flex-col gap-0.5">
        {menu.map((item) => {
          const active =
            pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
