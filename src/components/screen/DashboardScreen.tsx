import { useLocalQuery } from "@/hooks/useLocalQuery";
import { Link } from "@tanstack/react-router";
import { AlertCircle, Loader2 } from "lucide-react";
import type { Loan, Receipt, Handover, Group, Clan } from "@/db/types";

function formatIDR(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

export function DashboardScreen() {
  const { data: loansData, isLoading: loansLoading } =
    useLocalQuery<Loan>("loans");
  const { data: receiptsData, isLoading: receiptsLoading } =
    useLocalQuery<Receipt>("receipts");
  const { data: handoversData, isLoading: handoversLoading } =
    useLocalQuery<Handover>("handovers");
  const { data: groupsData, isLoading: groupsLoading } =
    useLocalQuery<Group>("groups");
  const { data: clansData, isLoading: clansLoading } =
    useLocalQuery<Clan>("clans");

  const loans = loansData?.docs ?? [];
  const receipts = receiptsData?.docs ?? [];
  const handovers = handoversData?.docs ?? [];
  const groups = groupsData?.docs ?? [];
  const clans = clansData?.docs ?? [];

  const isLoading =
    loansLoading ||
    receiptsLoading ||
    handoversLoading ||
    groupsLoading ||
    clansLoading;

  // Computed stats
  const activeLoans = loans.filter(
    (l) => l.status === "active" || l.status === "approved"
  );
  const settledLoans = loans.filter((l) => l.status === "settled");
  const totalDebt = activeLoans.reduce(
    (acc, l) => acc + (l.remainingValue ?? 0),
    0
  );
  const totalReceiptsValue = receipts.reduce(
    (acc, r) => acc + (r.calculatedValue ?? 0),
    0
  );
  const totalHandoversValue = handovers.reduce(
    (acc, h) => acc + (h.calculatedValue ?? 0),
    0
  );
  const pendingReceipts = receipts.filter(
    (r) => r.settlementStatus === "pending"
  );

  if (isLoading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dasbor Passura</h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan data buku besar adat.
        </p>
      </div>

      {/* Pending Actions Alert */}
      {(() => {
        const requestedLoans = loans.filter((l) => l.status === "requested");
        const pendingReceiptsList = receipts.filter(
          (r) => r.settlementStatus === "pending"
        );
        const totalPending =
          requestedLoans.length + pendingReceiptsList.length;
        if (totalPending === 0) return null;
        return (
          <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 text-orange-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  {totalPending} tindakan menunggu perhatian Anda
                </p>
                <ul className="text-xs text-orange-700 dark:text-orange-300 space-y-0.5">
                  {requestedLoans.length > 0 && (
                    <li>
                      <Link
                        to="/dashboard/loans"
                        className="underline"
                      >
                        {requestedLoans.length} pinjaman menunggu persetujuan
                      </Link>
                    </li>
                  )}
                  {pendingReceiptsList.length > 0 && (
                    <li>
                      <Link
                        to="/dashboard/receipts"
                        className="underline"
                      >
                        {pendingReceiptsList.length} penerimaan belum lunas
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Top metric cards */}
      <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Clan"
          value={clans.length}
          helper="Rumah tangga terdaftar"
        />
        <MetricCard
          label="Total Grup"
          value={groups.length}
          helper="Kelompok acara"
        />
        <MetricCard
          label="Pinjaman Aktif"
          value={activeLoans.length}
          helper={`${settledLoans.length} sudah lunas`}
        />
        <MetricCard
          label="Sisa Utang"
          value={formatIDR(totalDebt)}
          helper="Dari semua pinjaman aktif"
          monetary
        />
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Penerimaan"
          value={formatIDR(totalReceiptsValue)}
          helper={`${receipts.length} transaksi`}
          monetary
        />
        <MetricCard
          label="Total Penyerahan"
          value={formatIDR(totalHandoversValue)}
          helper={`${handovers.length} transaksi`}
          monetary
        />
        <MetricCard
          label="Penerimaan Pending"
          value={pendingReceipts.length}
          helper="Belum lunas"
        />
        <MetricCard
          label="Total Pinjaman"
          value={loans.length}
          helper="Semua status"
        />
      </div>

      {/* Recent activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border">
          <div className="p-4 border-b">
            <h2 className="text-sm font-medium text-muted-foreground">
              Pinjaman Terbaru
            </h2>
          </div>
          <div className="p-4">
            {loans.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada data pinjaman.
              </p>
            ) : (
              <ul className="space-y-2">
                {loans.slice(0, 5).map((loan) => (
                  <li
                    key={loan.id}
                    className="flex items-center justify-between text-sm border-b pb-2"
                  >
                    <div>
                      <span className="font-medium">
                        {loan.event || "Pinjaman"}
                      </span>
                      <span className="ml-2 text-muted-foreground">
                        ({loan.loanType})
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-orange-600">
                        Rp{" "}
                        {(loan.remainingValue ?? 0).toLocaleString("id-ID")}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {loan.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="rounded-lg border">
          <div className="p-4 border-b">
            <h2 className="text-sm font-medium text-muted-foreground">
              Penerimaan Terbaru
            </h2>
          </div>
          <div className="p-4">
            {receipts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada data penerimaan.
              </p>
            ) : (
              <ul className="space-y-2">
                {receipts.slice(0, 5).map((receipt) => (
                  <li
                    key={receipt.id}
                    className="flex items-center justify-between text-sm border-b pb-2"
                  >
                    <div>
                      <span className="font-medium">
                        {receipt.obligationType || "-"}
                      </span>
                      <span className="ml-2 text-muted-foreground">
                        ({receipt.assetType})
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-green-600">
                        Rp{" "}
                        {(receipt.calculatedValue ?? 0).toLocaleString(
                          "id-ID"
                        )}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {receipt.settlementStatus}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  monetary = false,
}: {
  label: string;
  value: number | string;
  helper: string;
  monetary?: boolean;
}) {
  return (
    <div className="rounded-lg border p-4 flex flex-col">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div
        className={`text-xl md:text-2xl font-semibold mt-1 ${
          monetary ? "text-orange-600" : "text-foreground"
        }`}
      >
        {value}
      </div>
      <p className="text-xs text-muted-foreground mt-1">{helper}</p>
    </div>
  );
}
