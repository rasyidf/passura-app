import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";

type Crumb = { label: string; href?: string };

const ROUTE_MAP: Record<string, string> = {
  "/dashboard": "Dasbor",
  "/dashboard/groups": "Grup Acara",
  "/dashboard/clans": "Clan",
  "/dashboard/participants": "Silsilah",
  "/dashboard/obligations": "Kewajiban",
  "/dashboard/receipts": "Penerimaan",
  "/dashboard/handovers": "Penyerahan",
  "/dashboard/loans": "Utang Piutang",
  "/dashboard/animal-types": "Jenis Hewan",
  "/dashboard/profile": "Pengaturan",
};

function buildCrumbs(pathname: string): Crumb[] {
  // Always start with home
  const crumbs: Crumb[] = [{ label: "Beranda", href: "/dashboard" }];

  if (pathname === "/dashboard") return crumbs;

  // Find the matching route label
  const label = ROUTE_MAP[pathname];
  if (label) {
    crumbs.push({ label });
  } else {
    // Fallback: split path and capitalise each segment
    const segments = pathname.replace("/dashboard/", "").split("/");
    segments.forEach((seg, i) => {
      const href = "/dashboard/" + segments.slice(0, i + 1).join("/");
      crumbs.push({
        label: ROUTE_MAP[href] ?? seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        href: i < segments.length - 1 ? href : undefined,
      });
    });
  }

  return crumbs;
}

export function Breadcrumbs() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const crumbs = buildCrumbs(pathname);

  // Don't show on the dashboard root — it would just be "Beranda" with nothing after it
  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 shrink-0" />}
            {i === 0 && <Home className="size-3.5 shrink-0" />}
            {crumb.href && !isLast ? (
              <Link
                to={crumb.href}
                className="hover:text-foreground transition-colors"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className={isLast ? "text-foreground font-medium" : ""}>
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
