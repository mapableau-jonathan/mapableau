/**
 * Central navigation config for menu and breadcrumbs.
 * Path segment (URL slug) -> display label. Nested entries define section sub-menus.
 */

export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

/** Segment label map for breadcrumbs (segment -> label). Use lowercase segment keys. */
export const SEGMENT_LABELS: Record<string, string> = {
  "": "Home",
  home: "Home",
  "accessibility-map": "Accessibility Map",
  care: "Care",
  notes: "Notes",
  plans: "Plans",
  goals: "Goals",
  builder: "Builder",
  create: "Create",
  transport: "Transport",
  book: "Book",
  bookings: "Bookings",
  jobs: "Jobs",
  employment: "Employment",
  board: "Job Board",
  post: "Post Job",
  applications: "Applications",
  analytics: "Analytics",
  venues: "Venues",
  dashboard: "Dashboard",
  places: "Places",
  admin: "Admin",
  audit: "Audit",
  reports: "Reports",
  compliance: "Compliance",
  venue: "Venue",
  sponsorships: "Sponsorships",
  verifications: "Verifications",
  workers: "Workers",
  verify: "Verify",
  compliance: "Compliance",
  complaints: "Complaints",
  register: "Register",
  improvements: "Improvements",
  incidents: "Incidents",
  policies: "Policies",
  risks: "Risks",
  training: "Training",
  matrix: "Matrix",
  abilitypay: "AbilityPay",
  participant: "Participant",
  "plan-manager": "Plan Manager",
  provider: "Provider",
  portal: "Portal",
  terminal: "Terminal",
  account: "Account",
  connected: "Connected",
  core: "Core",
  login: "Log In",
  feedback: "Feedback",
  providers: "Providers",
  status: "Status",
  quality: "Quality",
  onboard: "Onboard",
};

/** Top-level nav items (header + mobile menu). */
export const MAIN_NAV_ITEMS: NavItem[] = [
  { label: "Care", href: "/care" },
  { label: "Transport", href: "/transport" },
  { label: "Jobs", href: "/employment" },
  { label: "Venues", href: "/venues" },
  { label: "Accessibility Map", href: "/accessibility-map" },
  { label: "Dashboard", href: "/dashboard" },
];

/** Section sub-menus: path prefix -> list of { label, href }. */
export const SECTION_MENUS: Record<string, NavItem[]> = {
  "/care": [
    { label: "Overview", href: "/care" },
    { label: "Notes", href: "/care/notes" },
    { label: "Plans", href: "/care/plans" },
  ],
  "/transport": [
    { label: "Book", href: "/transport/book" },
    { label: "Bookings", href: "/transport/bookings" },
  ],
  "/jobs": [
    { label: "Board", href: "/jobs/board" },
    { label: "Post Job", href: "/jobs/post" },
    { label: "Applications", href: "/jobs/applications" },
    { label: "Analytics", href: "/jobs/analytics" },
  ],
  "/employment": [
    { label: "Job Board", href: "/jobs/board" },
    { label: "Post Job", href: "/jobs/post" },
    { label: "Applications", href: "/jobs/applications" },
    { label: "Analytics", href: "/jobs/analytics" },
  ],
  "/admin": [
    { label: "Audit", href: "/admin/audit" },
    { label: "Reports", href: "/admin/reports/compliance" },
    { label: "Sponsorships", href: "/admin/sponsorships" },
    { label: "Verifications", href: "/admin/verifications" },
    { label: "Workers", href: "/admin/workers/verify" },
  ],
  "/compliance": [
    { label: "Dashboard", href: "/compliance/dashboard" },
    { label: "Complaints", href: "/compliance/complaints" },
    { label: "Incidents", href: "/compliance/incidents" },
    { label: "Policies", href: "/compliance/policies" },
    { label: "Risks", href: "/compliance/risks" },
    { label: "Training", href: "/compliance/training" },
  ],
  "/workers": [
    { label: "Overview", href: "/workers" },
    { label: "Dashboard", href: "/workers/dashboard" },
    { label: "Onboard", href: "/workers/onboard" },
  ],
  "/abilitypay": [
    { label: "Admin", href: "/abilitypay/admin/dashboard" },
    { label: "Participant", href: "/abilitypay/participant/dashboard" },
    { label: "Plan Manager", href: "/abilitypay/plan-manager/dashboard" },
    { label: "Provider", href: "/abilitypay/provider/portal" },
    { label: "Terminal", href: "/abilitypay/terminal" },
  ],
};

/**
 * Get breadcrumb items from pathname.
 * e.g. /care/plans/builder -> [{ label: "Home", href: "/" }, { label: "Care", href: "/care" }, { label: "Plans", href: "/care/plans" }, { label: "Builder", href: "/care/plans/builder" }]
 */
export function getBreadcrumbItems(pathname: string): { label: string; href: string }[] {
  if (!pathname || pathname === "/") {
    return [{ label: "Home", href: "/" }];
  }
  const segments = pathname.split("/").filter(Boolean);
  const items: { label: string; href: string }[] = [{ label: "Home", href: "/" }];
  let href = "";
  for (const segment of segments) {
    href += `/${segment}`;
    const label = SEGMENT_LABELS[segment.toLowerCase()] ?? segment;
    // Use title-case for unknown segments (e.g. IDs): first letter upper, rest lower
    const displayLabel =
      label !== segment
        ? label
        : segment.length <= 2
          ? segment
          : segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
    items.push({ label: displayLabel, href });
  }
  return items;
}

/**
 * Find section menu for pathname (longest matching prefix).
 */
export function getSectionMenu(pathname: string): NavItem[] | null {
  let best: NavItem[] | null = null;
  let bestLen = 0;
  for (const [prefix, menu] of Object.entries(SECTION_MENUS)) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      if (prefix.length > bestLen) {
        bestLen = prefix.length;
        best = menu;
      }
    }
  }
  return best;
}
