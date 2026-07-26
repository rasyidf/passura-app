import { useState, useMemo } from "react";
import { useLocalQuery } from "@/hooks/useLocalQuery";
import { useDeleteDoc, useUpdateDoc } from "@/hooks/useLocalMutation";
import DataTable from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Banknote } from "lucide-react";
import type { Loan, Clan, AnimalType, Repayment } from "@/db/types";

export default function LoansScreen() {
  const { data, isLoading, refetch } = useLocalQuery<Loan>("loans");
  const { data: clansData } = useLocalQuery<Clan>("clans");
  const { data: animalsData } = useLocalQuery<AnimalType>("animal-types");
  const deleteLoan = useDeleteDoc("loans");
  const updateLoan = useUpdateDoc("loans");

  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [payItem, setPayItem] = useState<any>(null);

  const clans = clansData?.docs ?? [];
  const animalTypes = animalsData?.docs ?? [];
  const docs = data?.docs ?? [];

  const clanMap = useMemo(() => Object.fromEntries(clans.map((c) => [c.id, c.name])), [clans]);
  const nameOf = (id: string) => clanMap[id] || id;

  const rows = docs.map((l) => ({
    ...l,
    borrowerName: nameOf(l.borrower),
    lenderName: nameOf(l.lender),
  }));

  const columns: ColumnDef<any>[] = useMemo(() => [
    {
      accessorKey: "borrowerName", header: "Peminjam",
      cell: ({ row }) => <span className="font-medium text-primary">{row.original.borrowerName}</span>,
    },
    { accessorKey: "lenderName", header: "Pemberi" },
    {
      accessorKey: "loanType", header: "Jenis",
      cell: ({ row }) => <Badge variant="outline">{row.original.loanType === "animal" ? "🐄 Hewan" : "💵 Uang"}</Badge>,
    },
    {
      accessorKey: "calculatedPrincipalValue", header: "Pokok",
      cell: ({ row }) => <span className="font-mono text-sm">Rp {(row.original.calculatedPrincipalValue || 0).toLocaleString("id-ID")}</span>,
    },
    {
      accessorKey: "remainingValue", header: "Sisa",
      cell: ({ row }) => {
        const remaining = row.original.remainingValue || 0;
        return <span className={`font-mono text-sm font-medium ${remaining <= 0 ? "text-green-600" : "text-primary"}`}>Rp {remaining.toLocaleString("id-ID")}</span>;
      },
    },
    {
      accessorKey: "status", header: "Status",
      cell: ({ row }) => {
        const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
          requested: { label: "Diminta", variant: "outline" }, approved: { label: "Disetujui", variant: "secondary" },
          active: { label: "Aktif", variant: "default" }, settled: { label: "Lunas", variant: "secondary" },
          defaulted: { label: "Gagal", variant: "destructive" }, canceled: { label: "Batal", variant: "outline" },
        };
        const cfg = map[row.original.status] || { label: row.original.status, variant: "outline" as const };
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    {
      id: "__quickPay", header: "", enableSorting: false, size: 80,
      cell: ({ row }) => {
        if ((row.original.remainingValue || 0) <= 0) return null;
        return (
          <Button size="sm" variant="ghost" className="gap-1 text-xs text-primary hover:text-primary/80"
            onClick={(e) => { e.stopPropagation(); setPayItem(row.original); }}>
            <Banknote className="size-3.5" /> Bayar
          </Button>
        );
      },
    },
  ], [clanMap]);

  const filters = useMemo(() => [
    { id: "status", label: "Status", type: "segmented" as const, options: [{ value: "active", label: "Aktif" }, { value: "settled", label: "Lunas" }, { value: "requested", label: "Diminta" }] },
    { id: "loanType", label: "Jenis", type: "select" as const, options: [{ value: "animal", label: "Hewan" }, { value: "money", label: "Uang" }] },
  ], []);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Utang Piutang</h1>
        <p className="text-sm text-muted-foreground">Daftar pinjaman antar tongkonan.</p>
      </div>

      <DataTable
        columns={columns} data={rows} loading={isLoading}
        searchableColumnIds={["borrowerName", "lenderName"]} searchPlaceholder="Cari pinjaman..."
        filters={filters}
        onDelete={(row) => setDeleteItem(row)}
        emptyMessage="Belum ada data pinjaman."
      />

      <QuickRepaymentDialog
        loan={payItem} animalTypes={animalTypes}
        onClose={() => setPayItem(null)}
        onSuccess={async (repayment) => {
          if (!payItem) return;
          const existing = payItem.repayments || [];
          await updateLoan.mutateAsync({ id: payItem.id, data: { repayments: [...existing, repayment] } });
          toast.success("Pembayaran berhasil dicatat");
          setPayItem(null);
          refetch();
        }}
      />

      <Dialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus Pinjaman</DialogTitle>
            <DialogDescription>Hapus pinjaman untuk <strong>{deleteItem?.borrowerName}</strong>?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Batal</Button>
            <Button variant="destructive" disabled={deleteLoan.isPending} onClick={async () => {
              if (!deleteItem) return; await deleteLoan.mutateAsync(deleteItem.id); toast.success("Pinjaman berhasil dihapus"); setDeleteItem(null);
            }}>{deleteLoan.isPending ? "Menghapus..." : "Hapus"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuickRepaymentDialog({ loan, animalTypes, onClose, onSuccess }: {
  loan: any | null; animalTypes: AnimalType[]; onClose: () => void;
  onSuccess: (repayment: Repayment) => Promise<void>;
}) {
  const [repaymentType, setRepaymentType] = useState("money");
  const [moneyAmount, setMoneyAmount] = useState("");
  const [animalType, setAnimalType] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [loading, setLoading] = useState(false);

  if (!loan) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const repayment: Repayment = {
        id: crypto.randomUUID(),
        repaymentType: repaymentType as "animal" | "money",
        date: new Date().toISOString().slice(0, 10),
        witnesses: [],
        ...(repaymentType === "money" ? { moneyAmount: Number(moneyAmount) || 0 } : { animalType, quantity: Number(quantity) || 1 }),
      };
      await onSuccess(repayment);
      setMoneyAmount(""); setAnimalType(""); setQuantity("1");
    } catch {
      toast.error("Gagal menambah pembayaran");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={!!loan} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bayar Pinjaman</DialogTitle>
          <DialogDescription>
            {loan.borrowerName} → {loan.lenderName} | Sisa: Rp {(loan.remainingValue || 0).toLocaleString("id-ID")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Jenis Pembayaran</label>
            <select value={repaymentType} onChange={(e) => setRepaymentType(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="money">Uang</option><option value="animal">Hewan</option>
            </select>
          </div>
          {repaymentType === "money" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Jumlah (Rp)</label>
              <Input type="number" value={moneyAmount} onChange={(e) => setMoneyAmount(e.target.value)} placeholder="10000000" required />
            </div>
          )}
          {repaymentType === "animal" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Hewan</label>
                <select value={animalType} onChange={(e) => setAnimalType(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" required>
                  <option value="">Pilih</option>
                  {animalTypes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Jumlah</label>
                <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? "Menyimpan..." : "Catat Pembayaran"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
