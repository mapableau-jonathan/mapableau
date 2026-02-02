"use client";

import { usePathname } from "next/navigation";
import { getSectionMenu } from "@/lib/config/navigation";
import { Sidebar } from "./sidebar";
import { cn } from "@/app/lib/utils";

export interface PageWithSidebarProps {
  children: React.ReactNode;
  className?: string;
  /** Sidebar width (default: 56 = 14rem) */
  sidebarWidth?: "default" | "narrow" | "wide";
}

const SIDEBAR_WIDTH_CLASS = {
  default: "w-56",
  narrow: "w-48",
  wide: "w-64",
};

/**
 * Wraps page content: when the current path has a section menu (e.g. /care, /admin),
 * renders a sidebar + content; otherwise renders only children.
 */
export function PageWithSidebar({
  children,
  className,
  sidebarWidth = "default",
}: PageWithSidebarProps) {
  const pathname = usePathname();
  const menu = pathname ? getSectionMenu(pathname) : null;
  const showSidebar = Boolean(menu?.length);

  if (!showSidebar) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn("flex gap-6", className)}>
      <aside
        className={cn(
          "shrink-0 hidden sm:block border-r border-border pr-4",
          SIDEBAR_WIDTH_CLASS[sidebarWidth]
        )}
      >
        <Sidebar />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
