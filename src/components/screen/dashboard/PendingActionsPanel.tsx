import { useLocalQuery } from "@/hooks/useLocalQuery";
import { useUpdateDoc } from "@/hooks/useLocalMutation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle2, XCircle, PlayCircle, CreditCard } from "lucide-react";
import type { Loan, Receipt } from "@/db/types";

/**
 * Shows all actionable pending items (loan approvals, receipt settlements)
 * with one-click quick actions directly from the dashboard.
 */
export function PendingActionsPanel() {
  const { data: loansData, refetch: refetchLoans } = useLocalQuery<Loan>("loans");
  const { data: receiptsData, refetch: refetchReceipts } = useLocalQuery<Receipt>("receipts");
  const updateLoan = useUpdateDoc("loans");
  const updateReceipt = useUpdateDoc("receipts");

  const requestedLoans = (loansData?.docs ?? []).filter((l) => l.status === "requested");
  const approvedLoans = (loansData?.docs ?? []).filter((l) => l.status === "approved");
  const pendingReceipts = (receiptsData?.docs ?? []).filter((r) => r.settlementStatus === "pending");

  const totalActions = requestedLoans.length + approvedLoans.length + pendingReceipts.length;
  if (totalActions === 0) return null;

  async function handleLoanStatus(id: string, newStatus: Loan["status"]) {
    await updateLoan.mutateAsync({ id, data: { status: newStatus } });
    toast.success(`Pinjaman berhasil ${newStatus === "approved" ? "disetujui" : newStatus === "active" ? "diaktifkan" : "dibatalkan"}`);
    refetchLoans();
  }

  async function handleReceiptSettle(id: string) {
    await updateReceipt.mutateAsync({ id, data: { settlementStatus: "settled" } });
    toast.success("Penerimaan ditandai lunas");
    refetchReceipts();
  }

  return (
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
                    {loan.loanType === "animal" ? `${loan.quantity}× Hewan` : `Rp ${(loan.moneyAmount ?? 0).toLocaleString("id-ID")}`}
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
      </CardContent>
    </Card>
  );
}
