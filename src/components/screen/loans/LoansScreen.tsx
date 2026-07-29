import { useState, useMemo } from "react";
import { useLocalQuery } from "@/hooks/useLocalQuery";
import { useDeleteDoc, useUpdateDoc } from "@/hooks/useLocalMutation";
import { useClanMap } from "@/hooks/useLookupMaps";
import DataTable from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Banknote } from "lucide-react";
import type { Loan, AnimalType, Repayment } from "@/db/types";
import { MoneyCell } from "@/components/ui/money-cell";
import { ClanLink } from "@/components/shared/screen-helpers";
import { QuickRepaymentDialog } from "./QuickRepaymentDialog";
import {
  LOAN_STATUS_CONFIG,
  LOAN_STATUS_FILTER_OPTIONS,
  LOAN_TYPE_FILTER_OPTIONS,
  type LoanRow,
} from "./loans.constants";

export default function LoansScreen() {
  const { data, isLoading, refetch } = useLocalQuery<Loan>("loans");
  const { data: animalsData } = useLocalQuery<AnimalType>("animal-types");
  const deleteLoan = useDeleteDoc("loans");
  const updateLoan = useUpdateDoc("loans");

  const [deleteItem, setDeleteItem] = useState<LoanRow | null>(null);
  const [payItem, setPayItem] = useState<LoanRow | null>(null);

  const animalTypes = animalsData?.docs ?? [];
  const docs = data?.docs ?? [];

  const clanMap = useClanMap();

  const rows: LoanRow[] = docs.map((l) => ({
    ...l,
    borrowerName: clanMap[l.borrower] ?? l.borrower,
    lenderName: clanMap[l.lender] ?? l.lender,
  }));

  const columns: ColumnDef<LoanRow>[] = useMemo(
    () => [
      {
        accessorKey: "borrowerName",
        header: "Peminjam",
        cell: ({ row }) => (
          <ClanLink id={row.original.borrower} name={row.original.borrowerName} />
        ),
      },
      {
        accessorKey: "lenderName",
        header: "Pemberi",
        cell: ({ row }) => (
          <ClanLink id={row.original.lender} name={row.original.lenderName} />
        ),
      },
      {
        accessorKey: "loanType",
        header: "Jenis",
        cell: ({ row }) => (
          <Badge variant="outline">
            {row.original.loanType === "animal" ? "Hewan" : "Uang"}
          </Badge>
        ),
      },
      {
        accessorKey: "calculatedPrincipalValue",
        header: "Pokok",
        cell: ({ row }) => <MoneyCell value={row.original.calculatedPrincipalValue} />,
      },
      {
        accessorKey: "remainingValue",
        header: "Sisa",
        cell: ({ row }) => <MoneyCell value={row.original.remainingValue} highlightBalance />,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const cfg = LOAN_STATUS_CONFIG[row.original.status] ?? {
            label: row.original.status,
            variant: "outline" as const,
          };
          return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
        },
      },
      {
        id: "__quickPay",
        header: "",
        enableSorting: false,
        size: 80,
        cell: ({ row }) => {
          if ((row.original.remainingValue || 0) <= 0) return null;
          return (
            <Button
              size="sm"
              variant="ghost"
              className="gap-1 text-xs text-primary hover:text-primary/80"
              onClick={(e) => {
                e.stopPropagation();
                setPayItem(row.original);
              }}
            >
              <Banknote className="size-3.5" /> Bayar
            </Button>
          );
        },
      },
    ],
    [clanMap],
  );

  const filters = useMemo(
    () => [
      { id: "status",   label: "Status", type: "segmented" as const, options: LOAN_STATUS_FILTER_OPTIONS },
      { id: "loanType", label: "Jenis",  type: "select" as const,    options: LOAN_TYPE_FILTER_OPTIONS },
    ],
    [],
  );

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Utang Piutang</h1>
        <p className="text-sm text-muted-foreground">Daftar pinjaman antar tongkonan.</p>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={isLoading}
        searchableColumnIds={["borrowerName", "lenderName"]}
        searchPlaceholder="Cari pinjaman..."
        filters={filters}
        onDelete={(row) => setDeleteItem(row)}
        emptyMessage="Belum ada data pinjaman."
      />

      <QuickRepaymentDialog
        loan={payItem}
        animalTypes={animalTypes}
        onClose={() => setPayItem(null)}
        onSuccess={async (repayment: Repayment) => {
          if (!payItem) return;
          const existing = payItem.repayments || [];
          await updateLoan.mutateAsync({
            id: payItem.id,
            data: { repayments: [...existing, repayment] },
          });
          toast.success("Pembayaran berhasil dicatat");
          setPayItem(null);
          refetch();
        }}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Pinjaman</DialogTitle>
            <DialogDescription>
              Hapus pinjaman untuk <strong>{deleteItem?.borrowerName}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Batal</Button>
            <Button
              variant="destructive"
              disabled={deleteLoan.isPending}
              onClick={async () => {
                if (!deleteItem) return;
                await deleteLoan.mutateAsync(deleteItem.id);
                toast.success("Pinjaman berhasil dihapus");
                setDeleteItem(null);
              }}
            >
              {deleteLoan.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
