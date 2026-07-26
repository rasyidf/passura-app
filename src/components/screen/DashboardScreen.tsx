import { useLocalQuery } from "@/hooks/useLocalQuery";
import { Link } from "@tanstack/react-router";
import { AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PendingActionsPanel } from "./dashboard/PendingActionsPanel";
import type { Loan, Receipt, Handover, Group, Clan } from "@/db/types";

function formatIDR(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
}

export function DashboardScreen() {
  const { data: loansData, isLoading: loansLoading } = useLocalQuery<Loan>("loans");
  const { data: receiptsData, isLoading: receiptsLoading } = useLocalQuery<Receipt>("receipts");
  const { data: handoversData, isLoading: handoversLoading } = useLocalQuery<Handover>("handovers");
  const { data: groupsData, isLoading: groupsLoading } = useLocalQuery<Group>("groups");
  const { data: clansData, isLoading: clansLoading } = useLocalQuery<Clan>("clans");

  const loans = loansData?.docs ?? [];
  const receipts = receiptsData?.docs ?? [];
  const handovers = handoversData?.docs ?? [];
  const groups = groupsData?.docs ?? [];
  const clans = clansData?.docs ?? [];

  const isLoading = loansLoading || receiptsLoading || handoversLoading || groupsLoading || clansLoading;

  const activeLoans = loans.filter((l) => l.status === "active" || l.status === "approved");
  const settledLoans = loans.filter((l) => l.status === "settled");
  const totalDebt = activeLoans.reduce((acc, l) => acc + (l.remainingValue ?? 0), 0);
  const totalReceiptsValue = receipts.reduce((acc, r) => acc + (r.calculatedValue ?? 0), 0);
  const totalHandoversValue = handovers.reduce((acc, h) => acc + (h.calculatedValue ?? 0), 0);
  const pendingReceipts = receipts.filter((r) => r.settlementStatus === "pending");

  if (isLoading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const requestedLoans = loans.filter((l) => l.status === "requested");
  const totalPending = requestedLoans.length + pendingReceipts.length;

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dasbor Passura</h1>
        <p className="text-sm text-muted-foreground">Ringkasan data buku besar adat.</p>
      </div>

      {totalPending > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="size-5 text-orange-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                {totalPending} tindakan menunggu perhatian Anda
              </p>
              <ul className="text-xs text-orange-700 dark:text-orange-300 space-y-0.5">
                {requestedLoans.length > 0 && (
                  <li><Link to="/dashboard/loans" className="underline">{requestedLoans.length} pinjaman menunggu persetujuan</Link></li>
                )}
                {pendingReceipts.length > 0 && (
                  <li><Link to="/dashboard/receipts" className="underline">{pendingReceipts.length} penerimaan belum lunas</Link></li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total Clan" value={clans.length} helper="Rumah tangga terdaftar" />
        <MetricCard label="Total Grup" value={groups.length} helper="Kelompok acara" />
        <MetricCard label="Pinjaman Aktif" value={activeLoans.length} helper={`${settledLoans.length} sudah lunas`} />
        <MetricCard label="Sisa Utang" value={formatIDR(totalDebt)} helper="Dari semua pinjaman aktif" monetary />
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total Penerimaan" value={formatIDR(totalReceiptsValue)} helper={`${receipts.length} transaksi`} monetary />
        <MetricCard label="Total Penyerahan" value={formatIDR(totalHandoversValue)} helper={`${handovers.length} transaksi`} monetary />
        <MetricCard label="Penerimaan Pending" value={pendingReceipts.length} helper="Belum lunas" />
        <MetricCard label="Total Pinjaman" value={loans.length} helper="Semua status" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PendingActionsPanel />

        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Pinjaman Terbaru</CardTitle></CardHeader>
          <CardContent>
            {loans.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada data pinjaman.</p>
            ) : (
              <ul className="space-y-2">
                {loans.slice(0, 5).map((loan) => (
                  <li key={loan.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                    <div>
                      <span className="font-medium">{loan.event || "Pinjaman"}</span>
                      <span className="ml-2 text-muted-foreground">({loan.loanType})</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-primary">Rp {(loan.remainingValue ?? 0).toLocaleString("id-ID")}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{loan.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Penerimaan Terbaru</CardTitle></CardHeader>
          <CardContent>
            {receipts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada data penerimaan.</p>
            ) : (
              <ul className="space-y-2">
                {receipts.slice(0, 5).map((receipt) => (
                  <li key={receipt.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                    <div>
                      <span className="font-medium">{receipt.obligationType || "-"}</span>
                      <span className="ml-2 text-muted-foreground">({receipt.assetType})</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-green-600">Rp {(receipt.calculatedValue ?? 0).toLocaleString("id-ID")}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{receipt.settlementStatus}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, value, helper, monetary = false }: {
  label: string; value: number | string; helper: string; monetary?: boolean;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className={`text-xl md:text-2xl font-semibold ${monetary ? "text-primary" : "text-foreground"}`}>{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{helper}</p>
      </CardContent>
    </Card>
  );
}

export default DashboardScreen;
