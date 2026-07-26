import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/auth/session";
import { SyncStatusBar } from "./SyncStatusBar";
import {
  LayoutDashboard,
  Users,
  Receipt,
  ArrowRightLeft,
  Landmark,
  HandCoins,
  UserCircle,
  Menu,
  X,
  PawPrint,
  Network,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dasbor", icon: <LayoutDashboard className="size-4" /> },
  { href: "/dashboard/groups", label: "Grup", icon: <Users className="size-4" /> },
  { href: "/dashboard/clans", label: "Clan", icon: <Landmark className="size-4" /> },
  { href: "/dashboard/participants", label: "Silsilah", icon: <Network className="size-4" /> },
  { href: "/dashboard/obligations", label: "Kewajiban", icon: <HandCoins className="size-4" /> },
  { href: "/dashboard/receipts", label: "Penerimaan", icon: <Receipt className="size-4" /> },
  { href: "/dashboard/handovers", label: "Penyerahan", icon: <ArrowRightLeft className="size-4" /> },
  { href: "/dashboard/loans", label: "Utang Piutang", icon: <Landmark className="size-4" /> },
  { href: "/dashboard/animal-types", label: "Jenis Hewan", icon: <PawPrint className="size-4" /> },
  { href: "/dashboard/profile", label: "Profil & Backup", icon: <UserCircle className="size-4" /> },
];

export function Sidebar() {
  const { elder, logout } = useAuth();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const [mobileOpen, setMobileOpen] = useState(false);

  const navContent = (
    <>
      <nav className="p-2 flex-1 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setMobileOpen(false)}
              className={
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors " +
                (active
                  ? "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300"
                  : "hover:bg-muted text-muted-foreground")
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto p-3 border-t space-y-2">
        <button
          onClick={() => logout()}
          className="w-full inline-flex items-center justify-center rounded-md px-3 py-2 text-sm border hover:bg-muted"
        >
          Keluar
        </button>

        <div className="flex items-center gap-3 rounded-lg border p-3">
          <div className="size-8 rounded-md bg-orange-500 text-white grid place-items-center font-medium text-sm">
            {elder?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">
              {elder?.name ?? "Pengguna"}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {elder?.email ?? "-"}
            </div>
          </div>
        </div>
      </div>
      <SyncStatusBar />
    </>
  );

  return (
    <>
      {/* Mobile header bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 border-b bg-background flex items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-orange-500 text-white grid place-items-center font-bold text-xs">
            P
          </div>
          <span className="font-semibold">Passura</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-md hover:bg-muted"
          aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile slide-over */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute top-14 left-0 bottom-0 w-[280px] bg-background border-r flex flex-col overflow-y-auto">
            {navContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="border-r bg-white dark:bg-zinc-950 sticky top-0 h-screen w-[260px] shrink-0 hidden md:flex flex-col">
        <div className="px-4 h-14 flex items-center border-b">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-orange-500 text-white grid place-items-center font-bold text-xs">
              P
            </div>
            <span className="font-semibold text-xl tracking-tight">
              Passura
            </span>
          </Link>
        </div>
        {navContent}
      </aside>
    </>
  );
}
