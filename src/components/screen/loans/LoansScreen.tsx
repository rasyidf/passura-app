import { useState, useMemo } from "react";
import { useLocalQuery } from "@/hooks/useLocalQuery";
import { useDeleteDoc, useUpdateDoc } from "@/hooks/useLocalMutation";
import DataTable from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Banknote, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Loan, Clan, AnimalType, Repayment } from "@/db/types";
import { MoneyCell } from "@/components/ui/money-cell";
import { DatePicker } from "@/components/ui/date-picker";

function ClanLink({ id, name }: { id: string; name: string }) {
  return (
    <Link
      to="/dashboard/clans"
      className="inline-flex items-center gap-1 text-primary hover:underline underline-offset-2 font-medium text-sm"
      onClick={(e) => e.stopPropagation()}
    >
      {name || id}
      <ExternalLink className="size-3 opacity-60" />
    </Link>
  );
}

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
      cell: ({ row }) => <ClanLink id={row.original.borrower} name={row.original.borrowerName} />,
    },
    {
      accessorKey: "lenderName", header: "Pemberi",
      cell: ({ row }) => <ClanLink id={row.original.lender} name={row.original.lenderName} />,
    },
    {
      accessorKey: "loanType", header: "Jenis",
      cell: ({ row }) => <Badge variant="outline">{row.original.loanType === "animal" ? "Hewan" : "Uang"}</Badge>,
    },
    {
      accessorKey: "calculatedPrincipalValue", header: "Pokok",
      cell: ({ row }) => <MoneyCell value={row.original.calculatedPrincipalValue} />,
    },
    {
      accessorKey: "remainingValue", header: "Sisa",
      cell: ({ row }) => (
        <MoneyCell value={row.original.remainingValue} highlightBalance />
      ),
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
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  if (!loan) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const repayment: Repayment = {
        id: crypto.randomUUID(),
        repaymentType: repaymentType as "animal" | "money",
        date: date || new Date().toISOString().slice(0, 10),
        witnesses: [],
        ...(repaymentType === "money" ? { moneyAmount: Number(moneyAmount) || 0 } : { animalType, quantity: Number(quantity) || 1 }),
      };
      await onSuccess(repayment);
      setMoneyAmount(""); setAnimalType(""); setQuantity("1"); setDate(new Date().toISOString().slice(0, 10));
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
            <Label>Jenis Pembayaran</Label>
            <NativeSelect value={repaymentType} onChange={(e) => setRepaymentType(e.target.value)}>
              <NativeSelectOption value="money">Uang</NativeSelectOption>
              <NativeSelectOption value="animal">Hewan</NativeSelectOption>
            </NativeSelect>
          </div>
          {repaymentType === "money" && (
            <div className="space-y-2">
              <Label>Jumlah (Rp)</Label>
              <Input type="number" value={moneyAmount} onChange={(e) => setMoneyAmount(e.target.value)} placeholder="10000000" required />
            </div>
          )}
          {repaymentType === "animal" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Hewan</Label>
                <NativeSelect value={animalType} onChange={(e) => setAnimalType(e.target.value)} required>
                  <NativeSelectOption value="">Pilih</NativeSelectOption>
                  {animalTypes.map((a) => <NativeSelectOption key={a.id} value={a.id}>{a.name}</NativeSelectOption>)}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label>Jumlah</Label>
                <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>Tanggal Pembayaran</Label>
            <DatePicker value={date} onChange={setDate} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? "Menyimpan..." : "Catat Pembayaran"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
