import { useLocalQuery } from "@/hooks/useLocalQuery";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  Loader2,
  Monitor,
  TrendingUp,
  Users,
  Landmark,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PendingActionsPanel } from "./dashboard/PendingActionsPanel";
import { SetupCompletenessBanner } from "@/components/layout/SetupCompletenessBanner";
import { OnboardingReminderBanner } from "@/components/layout/OnboardingReminderBanner";
import { useAuth } from "@/auth/session";
import { useKiosk } from "@/kiosk/KioskContext";
import type { Loan, Receipt, Handover, Group, Clan } from "@/db/types";

function formatIDR(value: number) {
  if (value >= 1_000_000_000)
    return `Rp ${(value / 1_000_000_000).toFixed(1)}M`;
  if (value >= 1_000_000)
    return `Rp ${(value / 1_000_000).toFixed(0)}jt`;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatIDRFull(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

const OBLIGATION_LABEL: Record<string, string> = {
  ritual: "Ritual",
  social: "Sosial",
  wedding: "Pernikahan",
  funeral: "Pemakaman",
  other: "Lainnya",
};

const STATUS_STYLE: Record<string, string> = {
  requested: "bg-yellow-50 text-yellow-700 border-yellow-200",
  approved:  "bg-blue-50 text-blue-700 border-blue-200",
  active:    "bg-green-50 text-green-700 border-green-200",
  settled:   "bg-zinc-100 text-zinc-500 border-zinc-200",
  defaulted: "bg-red-50 text-red-700 border-red-200",
  canceled:  "bg-zinc-100 text-zinc-400 border-zinc-200",
  pending:   "bg-orange-50 text-orange-700 border-orange-200",
  partial:   "bg-blue-50 text-blue-600 border-blue-200",
};

const STATUS_LABEL: Record<string, string> = {
  requested: "Diminta",
  approved:  "Disetujui",
  active:    "Aktif",
  settled:   "Lunas",
  defaulted: "Gagal",
  canceled:  "Batal",
  pending:   "Pending",
  partial:   "Sebagian",
};

export function DashboardScreen() {
  const { elder } = useAuth();
  const kiosk = useKiosk();

  const { data: loansData, isLoading: loansLoading } = useLocalQuery<Loan>("loans");
  const { data: receiptsData, isLoading: receiptsLoading } = useLocalQuery<Receipt>("receipts");
  const { data: handoversData, isLoading: handoversLoading } = useLocalQuery<Handover>("handovers");
  const { data: groupsData, isLoading: groupsLoading } = useLocalQuery<Group>("groups");
  const { data: clansData, isLoading: clansLoading } = useLocalQuery<Clan>("clans");

  const showKioskButton = elder?.role === "validator";

  const loans = loansData?.docs ?? [];
  const receipts = receiptsData?.docs ?? [];
  const handovers = handoversData?.docs ?? [];
  const groups = groupsData?.docs ?? [];
  const clans = clansData?.docs ?? [];

  const isLoading =
    loansLoading || receiptsLoading || handoversLoading || groupsLoading || clansLoading;

  const activeLoans = loans.filter((l) => l.status === "active" || l.status === "approved");
  const settledLoans = loans.filter((l) => l.status === "settled");
  const requestedLoans = loans.filter((l) => l.status === "requested");
  const totalDebt = activeLoans.reduce((acc, l) => acc + (l.remainingValue ?? 0), 0);
  const totalReceiptsValue = receipts.reduce((acc, r) => acc + (r.calculatedValue ?? 0), 0);
  const totalHandoversValue = handovers.reduce((acc, h) => acc + (h.calculatedValue ?? 0), 0);
  const pendingReceipts = receipts.filter((r) => r.settlementStatus === "pending");
  const totalPending = requestedLoans.length + pendingReceipts.length;

  const recentLoans = [...loans]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 6);

  const recentReceipts = [...receipts]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 6);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="p-6 space-y-6">

        {/* ── Banners ─────────────────────────────────────────────── */}
        <SetupCompletenessBanner />
        <OnboardingReminderBanner />

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Dasbor Passura</h1>
            <p className="text-sm text-muted-foreground">Ringkasan data buku besar adat.</p>
          </div>
          {showKioskButton && (
            <Button
              onClick={() => kiosk.enter()}
              className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
              aria-label="Buka Mode Kios"
            >
              <Monitor className="size-4" aria-hidden="true" />
              Mode Kios
            </Button>
          )}
        </div>

        {/* ── Alert banner ────────────────────────────────────────── */}
        {totalPending > 0 && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 flex items-start gap-3">
            <AlertCircle className="size-4 text-orange-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <span className="font-medium text-orange-800">
                {totalPending} tindakan menunggu perhatian Anda —{" "}
              </span>
              {requestedLoans.length > 0 && (
                <Link to="/dashboard/loans" className="text-orange-700 underline underline-offset-2">
                  {requestedLoans.length} pinjaman belum lunas
                </Link>
              )}
              {requestedLoans.length > 0 && pendingReceipts.length > 0 && (
                <span className="text-orange-400 mx-1">·</span>
              )}
              {pendingReceipts.length > 0 && (
                <Link to="/dashboard/receipts" className="text-orange-700 underline underline-offset-2">
                  {pendingReceipts.length} penerimaan pending
                </Link>
              )}
            </div>
          </div>
        )}

        {/* ── KPI row 1 ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={<Landmark className="size-4" />}
            label="Total Clan"
            value={clans.length}
            sub={`${groups.length} grup acara`}
            accent="orange"
          />
          <KpiCard
            icon={<Users className="size-4" />}
            label="Pinjaman Aktif"
            value={activeLoans.length}
            sub={`${settledLoans.length} sudah lunas`}
            accent="blue"
          />
          <KpiCard
            icon={<CreditCard className="size-4" />}
            label="Sisa Utang"
            value={formatIDR(totalDebt)}
            sub="Dari semua pinjaman aktif"
            accent="red"
            monetary
          />
          <KpiCard
            icon={<Clock className="size-4" />}
            label="Penerimaan Pending"
            value={pendingReceipts.length}
            sub={`${receipts.length} total transaksi`}
            accent={pendingReceipts.length > 0 ? "orange" : "green"}
          />
        </div>

        {/* ── KPI row 2 ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={<ArrowDownLeft className="size-4" />}
            label="Total Penerimaan"
            value={formatIDR(totalReceiptsValue)}
            sub={`${receipts.length} transaksi`}
            accent="green"
            monetary
          />
          <KpiCard
            icon={<ArrowUpRight className="size-4" />}
            label="Total Penyerahan"
            value={formatIDR(totalHandoversValue)}
            sub={`${handovers.length} transaksi`}
            accent="purple"
            monetary
          />
          <KpiCard
            icon={<BarChart3 className="size-4" />}
            label="Total Pinjaman"
            value={loans.length}
            sub={`${requestedLoans.length} menunggu persetujuan`}
            accent={requestedLoans.length > 0 ? "orange" : "zinc"}
          />
          <KpiCard
            icon={<TrendingUp className="size-4" />}
            label="Total Grup"
            value={groups.length}
            sub="Kelompok acara aktif"
            accent="zinc"
          />
        </div>

        {/* ── Bottom panels ────────────────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-2">
          <PendingActionsPanel />

          <Panel
            title="Pinjaman Terbaru"
            icon={<CreditCard className="size-4 text-blue-500" />}
            linkTo="/dashboard/loans"
            isEmpty={recentLoans.length === 0}
            emptyText="Belum ada data pinjaman."
          >
            <div className="divide-y">
              {recentLoans.map((loan) => (
                <div key={loan.id} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{loan.event || "Pinjaman"}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        ({loan.loanType === "animal" ? "hewan" : "uang"})
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      {formatIDRFull(loan.remainingValue ?? 0)}
                    </p>
                  </div>
                  <StatusPill status={loan.status} />
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* ── Recent receipts ──────────────────────────────────────── */}
        <Panel
          title="Penerimaan Terbaru"
          icon={<ArrowDownLeft className="size-4 text-green-500" />}
          linkTo="/dashboard/receipts"
          isEmpty={recentReceipts.length === 0}
          emptyText="Belum ada data penerimaan."
        >
          <div className="divide-y">
            {recentReceipts.map((receipt) => (
              <div key={receipt.id} className="flex items-center justify-between py-2.5 gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium capitalize">
                      {OBLIGATION_LABEL[receipt.obligationType] ?? receipt.obligationType}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      ({receipt.assetType === "animal" ? "hewan" : "uang"})
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                    {formatIDRFull(receipt.calculatedValue ?? 0)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {receipt.settlementStatus === "settled" && (
                    <CheckCircle2 className="size-3.5 text-green-500" />
                  )}
                  <StatusPill status={receipt.settlementStatus} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

type Accent = "orange" | "blue" | "green" | "red" | "purple" | "zinc";

const ACCENT_ICON: Record<Accent, string> = {
  orange: "bg-orange-100 text-orange-600",
  blue:   "bg-blue-100 text-blue-600",
  green:  "bg-green-100 text-green-600",
  red:    "bg-red-100 text-red-600",
  purple: "bg-purple-100 text-purple-600",
  zinc:   "bg-zinc-100 text-zinc-500",
};

const ACCENT_VALUE: Record<Accent, string> = {
  orange: "text-orange-600",
  blue:   "text-blue-700",
  green:  "text-green-700",
  red:    "text-red-600",
  purple: "text-purple-700",
  zinc:   "text-foreground",
};

function KpiCard({
  icon, label, value, sub, accent = "zinc", monetary = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub: string;
  accent?: Accent;
  monetary?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-4">
        <div className="flex items-center gap-2">
          <span className={`size-7 rounded-md flex items-center justify-center shrink-0 ${ACCENT_ICON[accent]}`}>
            {icon}
          </span>
          <span className="text-sm text-muted-foreground font-medium truncate">{label}</span>
        </div>
        <div>
          <div className={`text-2xl font-bold leading-none tabular-nums ${monetary ? ACCENT_VALUE[accent] : "text-foreground"}`}>
            {value}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 leading-tight">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Panel({
  title,
  icon,
  linkTo,
  children,
  isEmpty,
  emptyText,
}: {
  title: string;
  icon: React.ReactNode;
  linkTo: string;
  children: React.ReactNode;
  isEmpty: boolean;
  emptyText: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between border-b py-3 px-4">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <Link
          to={linkTo}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Lihat semua →
        </Link>
      </CardHeader>
      <CardContent className="px-4 py-1">
        {isEmpty ? (
          <p className="text-sm text-muted-foreground py-4">{emptyText}</p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

function StatusPill({ status }: { status: string }) {
  const style = STATUS_STYLE[status] ?? "bg-zinc-100 text-zinc-500 border-zinc-200";
  const label = STATUS_LABEL[status] ?? status;
  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium shrink-0 ${style}`}
    >
      {label}
    </Badge>
  );
}
