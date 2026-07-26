import { useState, useMemo } from "react";
import { useLocalQuery } from "@/hooks/useLocalQuery";
import { useCreateDoc, useUpdateDoc, useDeleteDoc } from "@/hooks/useLocalMutation";
import { useForm } from "react-hook-form";
import DataTable from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormItem, FormLabel, FormControl, FormMessage, FormField } from "@/components/ui/form";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import type { Receipt, Clan, AnimalType } from "@/db/types";

type FormValues = { receiver: string; giver: string; assetType: string; obligationType: string; moneyAmount: string; animalType: string; quantity: string; dateReceived: string; notes: string };

const OBLIGATION_TYPES = [
  { value: "ritual", label: "Ritual" }, { value: "social", label: "Sosial" },
  { value: "wedding", label: "Pernikahan" }, { value: "funeral", label: "Pemakaman" }, { value: "other", label: "Lainnya" },
];

export default function ReceiptsScreen() {
  const { data, isLoading } = useLocalQuery<Receipt>("receipts");
  const { data: clansData } = useLocalQuery<Clan>("clans");
  const { data: animalsData } = useLocalQuery<AnimalType>("animal-types");
  const createReceipt = useCreateDoc("receipts");
  const updateReceipt = useUpdateDoc("receipts");
  const deleteReceipt = useDeleteDoc("receipts");

  const [editItem, setEditItem] = useState<Receipt | null>(null);
  const [deleteItem, setDeleteItem] = useState<Receipt | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const clans = clansData?.docs ?? [];
  const animalTypes = animalsData?.docs ?? [];
  const rows = data?.docs ?? [];

  const clanMap = useMemo(() => Object.fromEntries(clans.map((c) => [c.id, c.name])), [clans]);
  const nameOf = (id: string) => clanMap[id] || id;

  const columns: ColumnDef<Receipt>[] = useMemo(() => [
    { accessorKey: "dateReceived", header: "Tanggal", cell: ({ row }) => row.original.dateReceived?.slice(0, 10) || "-" },
    { accessorKey: "receiver", header: "Penerima", cell: ({ row }) => nameOf(row.original.receiver) },
    { accessorKey: "giver", header: "Pemberi", cell: ({ row }) => nameOf(row.original.giver) },
    { accessorKey: "obligationType", header: "Jenis" },
    { accessorKey: "assetType", header: "Aset" },
    { accessorKey: "calculatedValue", header: "Nilai (Rp)", cell: ({ row }) => `Rp ${(row.original.calculatedValue || 0).toLocaleString("id-ID")}` },
    { accessorKey: "settlementStatus", header: "Status" },
  ], [clanMap]);

  const filters = useMemo(() => [
    { id: "obligationType", label: "Jenis", type: "select" as const, options: OBLIGATION_TYPES },
    { id: "settlementStatus", label: "Status", type: "segmented" as const, options: [{ value: "pending", label: "Pending" }, { value: "partial", label: "Sebagian" }, { value: "settled", label: "Lunas" }] },
  ], []);

  const buildPayload = (v: FormValues) => {
    const p: Record<string, unknown> = { receiver: v.receiver, giver: v.giver, assetType: v.assetType, obligationType: v.obligationType, dateReceived: v.dateReceived, notes: v.notes || undefined };
    if (v.assetType === "money") p.moneyAmount = Number(v.moneyAmount) || 0;
    if (v.assetType === "animal") { p.animalType = v.animalType; p.quantity = Number(v.quantity) || 1; }
    return p;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Penerimaan</h1>
          <p className="text-sm text-muted-foreground">Catatan penerimaan donasi dari clan lain.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="size-4" /> Catat Penerimaan</Button>
      </div>

      <DataTable data={rows} columns={columns} searchableColumnIds={["obligationType"]} searchPlaceholder="Cari penerimaan..."
        filters={filters} loading={isLoading} onEdit={(r) => setEditItem(r)} onDelete={(r) => setDeleteItem(r)} emptyMessage="Belum ada data penerimaan." />

      <ReceiptFormDialog open={showCreate} onOpenChange={setShowCreate} title="Catat Penerimaan Baru"
        clans={clans} animalTypes={animalTypes}
        onSubmit={async (v) => { await createReceipt.mutateAsync(buildPayload(v)); toast.success("Penerimaan berhasil dicatat"); setShowCreate(false); }}
        loading={createReceipt.isPending} />

      <ReceiptFormDialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)} title="Edit Penerimaan"
        clans={clans} animalTypes={animalTypes}
        defaultValues={editItem ? { receiver: editItem.receiver, giver: editItem.giver, assetType: editItem.assetType, obligationType: editItem.obligationType, moneyAmount: String(editItem.moneyAmount || ""), animalType: editItem.animalType || "", quantity: String(editItem.quantity || ""), dateReceived: editItem.dateReceived?.slice(0, 10) || "", notes: editItem.notes || "" } : undefined}
        onSubmit={async (v) => { if (!editItem) return; await updateReceipt.mutateAsync({ id: editItem.id, data: buildPayload(v) }); toast.success("Berhasil diperbarui"); setEditItem(null); }}
        loading={updateReceipt.isPending} />

      <Dialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus Penerimaan</DialogTitle>
            <DialogDescription>Hapus catatan penerimaan ini?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Batal</Button>
            <Button variant="destructive" disabled={deleteReceipt.isPending} onClick={async () => {
              if (!deleteItem) return; await deleteReceipt.mutateAsync(deleteItem.id); toast.success("Berhasil dihapus"); setDeleteItem(null);
            }}>{deleteReceipt.isPending ? "Menghapus..." : "Hapus"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReceiptFormDialog({ open, onOpenChange, title, clans, animalTypes, defaultValues, onSubmit, loading }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; clans: Clan[]; animalTypes: AnimalType[];
  defaultValues?: FormValues; onSubmit: (v: FormValues) => Promise<void>; loading: boolean;
}) {
  const defaults: FormValues = defaultValues || { receiver: "", giver: "", assetType: "money", obligationType: "ritual", moneyAmount: "", animalType: "", quantity: "", dateReceived: "", notes: "" };
  const methods = useForm<FormValues>({ defaultValues: defaults, values: defaults });
  const assetType = methods.watch("assetType");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <Form {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {(["receiver", "giver"] as const).map((key) => (
                <FormField key={key} control={methods.control} name={key} rules={{ required: "Wajib" }} render={({ field }) => (
                  <FormItem><FormLabel>{key === "receiver" ? "Penerima" : "Pemberi"}</FormLabel><FormControl>
                    <select {...field} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                      <option value="">Pilih Clan</option>
                      {clans.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select></FormControl><FormMessage /></FormItem>
                )} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={methods.control} name="obligationType" render={({ field }) => (
                <FormItem><FormLabel>Jenis Kewajiban</FormLabel><FormControl>
                  <select {...field} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {OBLIGATION_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={methods.control} name="assetType" render={({ field }) => (
                <FormItem><FormLabel>Jenis Aset</FormLabel><FormControl>
                  <select {...field} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="money">Uang</option><option value="animal">Hewan</option>
                  </select></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            {assetType === "money" && (
              <FormField control={methods.control} name="moneyAmount" rules={{ required: "Wajib" }} render={({ field }) => (
                <FormItem><FormLabel>Jumlah Uang (Rp)</FormLabel><FormControl><Input type="number" placeholder="10000000" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            )}
            {assetType === "animal" && (
              <div className="grid grid-cols-2 gap-4">
                <FormField control={methods.control} name="animalType" rules={{ required: "Wajib" }} render={({ field }) => (
                  <FormItem><FormLabel>Jenis Hewan</FormLabel><FormControl>
                    <select {...field} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                      <option value="">Pilih Hewan</option>
                      {animalTypes.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.breed})</option>)}
                    </select></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={methods.control} name="quantity" rules={{ required: "Wajib" }} render={({ field }) => (
                  <FormItem><FormLabel>Kuantitas</FormLabel><FormControl><Input type="number" min="1" placeholder="1" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            )}
            <FormField control={methods.control} name="dateReceived" rules={{ required: "Wajib" }} render={({ field }) => (
              <FormItem><FormLabel>Tanggal Diterima</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={methods.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Keterangan</FormLabel><FormControl><Textarea placeholder="Catatan opsional..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
              <Button type="submit" disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
