import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useLocalQuery } from "@/hooks/useLocalQuery";
import { useUpdateDoc } from "@/hooks/useLocalMutation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, XCircle, PlayCircle, CreditCard, AlertTriangle } from "lucide-react";
import { useAuth } from "@/auth/session";
import { db } from "@/db/local-db";
import type { Loan, Receipt, SyncLogEntry } from "@/db/types";

/**
 * Shows all actionable pending items (loan approvals, receipt settlements,
 * and sync conflicts) with one-click quick actions directly from the dashboard.
 *
 * Conflict entries are only shown to users with role "validator" or "admin".
 */
export function PendingActionsPanel() {
  const { elder } = useAuth();
  const { data: loansData, refetch: refetchLoans } = useLocalQuery<Loan>("loans");
  const { data: receiptsData, refetch: refetchReceipts } = useLocalQuery<Receipt>("receipts");
  const updateLoan = useUpdateDoc("loans");
  const updateReceipt = useUpdateDoc("receipts");

  // Live query for conflict entries — only fetched when role allows
  const canReviewConflicts =
    elder?.role === "validator" || elder?.role === "superadmin";

  const conflictEntries = useLiveQuery(
    () =>
      canReviewConflicts
        ? db.syncLog.where("syncStatus").equals("conflict").toArray()
        : Promise.resolve([] as SyncLogEntry[]),
    [canReviewConflicts]
  );

  // State for the resolution modal
  const [selectedConflict, setSelectedConflict] = useState<SyncLogEntry | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const requestedLoans = (loansData?.docs ?? []).filter((l) => l.status === "requested");
  const approvedLoans = (loansData?.docs ?? []).filter((l) => l.status === "approved");
  const pendingReceipts = (receiptsData?.docs ?? []).filter((r) => r.settlementStatus === "pending");
  const conflicts = conflictEntries ?? [];

  const totalActions =
    requestedLoans.length + approvedLoans.length + pendingReceipts.length + conflicts.length;

  if (totalActions === 0) return null;

  async function handleLoanStatus(id: string, newStatus: Loan["status"]) {
    await updateLoan.mutateAsync({ id, data: { status: newStatus } });
    toast.success(
      `Pinjaman berhasil ${
        newStatus === "approved"
          ? "disetujui"
          : newStatus === "active"
            ? "diaktifkan"
            : "dibatalkan"
      }`
    );
    refetchLoans();
  }

  async function handleReceiptSettle(id: string) {
    await updateReceipt.mutateAsync({ id, data: { settlementStatus: "settled" } });
    toast.success("Penerimaan ditandai lunas");
    refetchReceipts();
  }

  /**
   * "Simpan Lokal" — keep the local version, mark the syncLog entry as synced.
   * The local entity record is already correct; we just clear the conflict flag.
   */
  async function handleKeepLocal() {
    if (!selectedConflict?.id) return;
    setIsResolving(true);
    try {
      await db.syncLog.update(selectedConflict.id, { syncStatus: "synced" });
      toast.success("Versi lokal disimpan. Konflik diselesaikan.");
      setSelectedConflict(null);
    } catch {
      toast.error("Gagal menyelesaikan konflik. Coba lagi.");
    } finally {
      setIsResolving(false);
    }
  }

  /**
   * "Gunakan Server" — accept the server version.
   * The actual entity overwrite happens via the next sync cycle; here we just
   * mark the syncLog entry as synced so it no longer blocks the queue.
   */
  async function handleUseServer() {
    if (!selectedConflict?.id) return;
    setIsResolving(true);
    try {
      await db.syncLog.update(selectedConflict.id, { syncStatus: "synced" });
      toast.success("Versi server diterima. Konflik diselesaikan.");
      setSelectedConflict(null);
    } catch {
      toast.error("Gagal menyelesaikan konflik. Coba lagi.");
    } finally {
      setIsResolving(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CreditCard className="size-4 text-primary" />
            Tindakan Cepat
            <Badge variant="default" className="ml-auto">{totalActions}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Requested loans — need approval */}
          {requestedLoans.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Pinjaman Menunggu Persetujuan ({requestedLoans.length})
              </p>
              {requestedLoans.map((loan) => (
                <div key={loan.id} className="flex items-center gap-2 rounded-md border p-2.5 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{loan.event}</p>
                    <p className="text-xs text-muted-foreground">
                      {loan.loanType === "animal"
                        ? `${loan.quantity}× Hewan`
                        : `Rp ${(loan.moneyAmount ?? 0).toLocaleString("id-ID")}`}
                      {" · "}
                      <span className="font-mono">sisa Rp {(loan.remainingValue ?? 0).toLocaleString("id-ID")}</span>
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 gap-1 text-xs"
                      disabled={updateLoan.isPending}
                      onClick={() => handleLoanStatus(loan.id, "approved")}
                    >
                      <CheckCircle2 className="size-3" /> Setujui
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                      disabled={updateLoan.isPending}
                      onClick={() => handleLoanStatus(loan.id, "canceled")}
                    >
                      <XCircle className="size-3" /> Tolak
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Approved loans — ready to activate */}
          {approvedLoans.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Pinjaman Disetujui — Belum Aktif ({approvedLoans.length})
              </p>
              {approvedLoans.map((loan) => (
                <div key={loan.id} className="flex items-center gap-2 rounded-md border p-2.5 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{loan.event}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      Rp {(loan.calculatedPrincipalValue ?? 0).toLocaleString("id-ID")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 gap-1 text-xs shrink-0"
                    disabled={updateLoan.isPending}
                    onClick={() => handleLoanStatus(loan.id, "active")}
                  >
                    <PlayCircle className="size-3" /> Aktifkan
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Pending receipts — need settlement */}
          {pendingReceipts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Penerimaan Belum Lunas ({pendingReceipts.length})
              </p>
              {pendingReceipts.map((receipt) => (
                <div key={receipt.id} className="flex items-center gap-2 rounded-md border p-2.5 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium capitalize">{receipt.obligationType}</p>
                    <p className="text-xs text-muted-foreground">
                      {receipt.assetType === "money"
                        ? `Rp ${(receipt.moneyAmount ?? 0).toLocaleString("id-ID")}`
                        : `${receipt.quantity}× Hewan`}
                      {" · "}
                      <span className="font-mono text-green-600">Rp {(receipt.calculatedValue ?? 0).toLocaleString("id-ID")}</span>
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 text-xs shrink-0"
                    disabled={updateReceipt.isPending}
                    onClick={() => handleReceiptSettle(receipt.id)}
                  >
                    <CheckCircle2 className="size-3 text-green-600" /> Lunaskan
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Sync conflicts — visible to validator/admin only */}
          {canReviewConflicts && conflicts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Konflik Data ({conflicts.length})
              </p>
              {conflicts.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-sm"
                >
                  <AlertTriangle className="size-4 text-destructive shrink-0" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">Konflik data — perlu ditinjau</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {entry.entityType} · {entry.action}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs shrink-0"
                    onClick={() => setSelectedConflict(entry)}
                  >
                    Tinjau
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conflict resolution modal */}
      <Dialog
        open={selectedConflict !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedConflict(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tinjau Konflik Data</DialogTitle>
            <DialogDescription>
              Data lokal Anda bertentangan dengan versi di server. Pilih versi mana yang ingin disimpan.
            </DialogDescription>
          </DialogHeader>

          {selectedConflict && (
            <div className="space-y-3">
              {/* Entity metadata */}
              <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipe entitas</span>
                  <span className="font-medium capitalize">{selectedConflict.entityType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Aksi</span>
                  <span className="font-medium capitalize">{selectedConflict.action}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Waktu dicatat</span>
                  <span className="font-medium">
                    {new Date(selectedConflict.createdAt).toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              {/* Conflicting fields */}
              {Object.keys(selectedConflict.data).length > 0 && (
                <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Data Lokal
                  </p>
                  {Object.entries(selectedConflict.data)
                    .filter(([key]) => !["id", "syncStatus", "createdAt", "updatedAt"].includes(key))
                    .map(([key, value]) => (
                      <div key={key} className="flex justify-between gap-4">
                        <span className="text-muted-foreground shrink-0">{key}</span>
                        <span className="font-medium text-right break-all">
                          {typeof value === "object" ? JSON.stringify(value) : String(value ?? "—")}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              disabled={isResolving}
              onClick={handleKeepLocal}
            >
              Simpan Lokal
            </Button>
            <Button
              variant="default"
              disabled={isResolving}
              onClick={handleUseServer}
            >
              Gunakan Server
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
