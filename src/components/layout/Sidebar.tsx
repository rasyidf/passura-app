import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/auth/session";
import { SystemHealthFooter } from "./SystemHealthFooter";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/contexts/ThemeContext";
import type { Theme } from "@/contexts/ThemeContext";
import {
  LayoutDashboard,
  Users,
  Receipt,
  ArrowRightLeft,
  Landmark,
  HandCoins,
  Settings,
  X,
  PawPrint,
  Network,
  ScrollText,
  Menu as MenuIcon,
  HardDrive,
  RefreshCw,
  ChevronUp,
  Sun,
  Moon,
  Monitor,
  LogOut,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

type NavGroup = {
  label?: string; // undefined = no heading (top-level)
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    items: [
      { href: "/dashboard", label: "Dasbor", icon: <LayoutDashboard className="size-4" /> },
    ],
  },
  {
    label: "Komunitas",
    items: [
      { href: "/dashboard/groups", label: "Grup Acara", icon: <Users className="size-4" /> },
      { href: "/dashboard/clans", label: "Clan", icon: <Landmark className="size-4" /> },
      { href: "/dashboard/participants", label: "Silsilah", icon: <Network className="size-4" /> },
    ],
  },
  {
    label: "Transaksi",
    items: [
      { href: "/dashboard/obligations", label: "Kewajiban", icon: <HandCoins className="size-4" /> },
      { href: "/dashboard/receipts", label: "Penerimaan", icon: <Receipt className="size-4" /> },
      { href: "/dashboard/handovers", label: "Penyerahan", icon: <ArrowRightLeft className="size-4" /> },
      { href: "/dashboard/loans", label: "Utang Piutang", icon: <ScrollText className="size-4" /> },
    ],
  },
  {
    label: "Referensi",
    items: [
      { href: "/dashboard/animal-types", label: "Jenis Hewan", icon: <PawPrint className="size-4" /> },
    ],
  },
  {
    label: "Konfigurasi",
    items: [
      { href: "/dashboard/profile", label: "Pengaturan", icon: <Settings className="size-4" /> },
      { href: "/dashboard/backup",  label: "Backup",     icon: <HardDrive className="size-4" /> },
      { href: "/dashboard/sync",    label: "Sinkronisasi", icon: <RefreshCw className="size-4" /> },
    ],
  },
];

// Theme cycle helpers
const THEME_CYCLE: Theme[] = ['light', 'dark', 'system'];

function nextTheme(current: Theme): Theme {
  const idx = THEME_CYCLE.indexOf(current);
  return THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
}

const THEME_META: Record<Theme, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
  light:  { icon: Sun,     label: 'Terang' },
  dark:   { icon: Moon,    label: 'Gelap'  },
  system: { icon: Monitor, label: 'Sistem' },
};

export function Sidebar() {
  const { elder, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleThemeCycle = () => setTheme(nextTheme(theme));
  const ThemeIcon = THEME_META[theme].icon;
  const themeLabel = THEME_META[theme].label;

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const navContent = (
    <>
      <nav className="p-2 flex-1 overflow-y-auto space-y-4">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 select-none">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors " +
                      (active
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground")
                    }
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto p-3 border-t">
        <DropdownMenu>
          <DropdownMenuTrigger render={<button className="w-full flex items-center gap-3 rounded-lg border pl-3 py-3 pr-4 hover:bg-muted transition-colors text-left" />}>
            <div className="size-8 rounded-md bg-primary text-primary-foreground grid place-items-center font-medium text-sm shrink-0">
              {elder?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{elder?.name ?? 'Pengguna'}</div>
              <div className="truncate text-xs text-muted-foreground">{elder?.email ?? '-'}</div>
            </div>
            <ChevronUp className="size-4 text-muted-foreground shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="w-[220px]">
            <DropdownMenuItem onClick={handleThemeCycle}>
              <ThemeIcon className="size-4" />
              <span>{themeLabel}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
              <LogOut className="size-4" />
              <span>Keluar</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <SystemHealthFooter />
    </>
  );

  return (
    <>
      {/* Mobile header bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 border-b bg-background flex items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold text-xs">
            P
          </div>
          <span className="font-semibold">Passura</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-md hover:bg-muted"
          aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
        >
          {mobileOpen ? <X className="size-5" /> : <MenuIcon className="size-5" />}
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
            <div className="size-7 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold text-xs">
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
