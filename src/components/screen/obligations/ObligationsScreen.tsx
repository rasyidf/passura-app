import { useState, useMemo } from "react";
import { useLocalQuery } from "@/hooks/useLocalQuery";
import { useCreateDoc, useUpdateDoc, useDeleteDoc } from "@/hooks/useLocalMutation";
import { useForm } from "react-hook-form";
import DataTable from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormItem, FormLabel, FormControl, FormMessage, FormField } from "@/components/ui/form";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import type { Obligation, Clan, AnimalType } from "@/db/types";

type FormValues = { giver: string; receiver: string; paymentType: string; animalType: string; moneyAmount: string; quantity: string; event: string; date: string };

export default function ObligationsScreen() {
  const { data, isLoading } = useLocalQuery<Obligation>("obligations");
  const { data: clansData } = useLocalQuery<Clan>("clans");
  const { data: animalsData } = useLocalQuery<AnimalType>("animal-types");
  const createObligation = useCreateDoc("obligations");
  const updateObligation = useUpdateDoc("obligations");
  const deleteObligation = useDeleteDoc("obligations");

  const [editItem, setEditItem] = useState<Obligation | null>(null);
  const [deleteItem, setDeleteItem] = useState<Obligation | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const clans = clansData?.docs ?? [];
  const animalTypes = animalsData?.docs ?? [];
  const rows = data?.docs ?? [];

  const clanMap = useMemo(() => Object.fromEntries(clans.map((c) => [c.id, c.name])), [clans]);
  const nameOf = (id: string) => clanMap[id] || id;

  const columns: ColumnDef<Obligation>[] = useMemo(() => [
    { accessorKey: "event", header: "Acara" },
    { accessorKey: "date", header: "Tanggal", cell: ({ row }) => row.original.date?.slice(0, 10) || "-" },
    { accessorKey: "giver", header: "Pemberi", cell: ({ row }) => nameOf(row.original.giver) },
    { accessorKey: "receiver", header: "Penerima", cell: ({ row }) => nameOf(row.original.receiver) },
    { accessorKey: "paymentType", header: "Jenis" },
    { accessorKey: "calculatedValue", header: "Nilai (Rp)", cell: ({ row }) => `Rp ${(row.original.calculatedValue || 0).toLocaleString("id-ID")}` },
  ], [clanMap]);

  const buildPayload = (v: FormValues) => {
    const p: Record<string, unknown> = { giver: v.giver, receiver: v.receiver, paymentType: v.paymentType, quantity: Number(v.quantity) || 1, event: v.event, date: v.date };
    if (v.paymentType === "money") p.moneyAmount = Number(v.moneyAmount) || 0;
    if (v.paymentType === "animal") p.animalType = v.animalType;
    return p;
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold">Kewajiban</h1>
          <p className="text-sm text-muted-foreground">Catatan kewajiban adat antar clan.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="size-4" /> Catat Kewajiban</Button>
      </div>

      <DataTable data={rows} columns={columns} searchableColumnIds={["event"]} searchPlaceholder="Cari kewajiban..."
        loading={isLoading} onEdit={(r) => setEditItem(r)} onDelete={(r) => setDeleteItem(r)} emptyMessage="Belum ada data kewajiban." />

      <ObligationFormDialog open={showCreate} onOpenChange={setShowCreate} title="Catat Kewajiban Baru"
        clans={clans} animalTypes={animalTypes}
        onSubmit={async (v) => { await createObligation.mutateAsync(buildPayload(v)); toast.success("Kewajiban berhasil dicatat"); setShowCreate(false); }}
        loading={createObligation.isPending} />

      <ObligationFormDialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)} title="Edit Kewajiban"
        clans={clans} animalTypes={animalTypes}
        defaultValues={editItem ? { giver: editItem.giver, receiver: editItem.receiver, paymentType: editItem.paymentType, animalType: editItem.animalType || "", moneyAmount: String(editItem.moneyAmount || ""), quantity: String(editItem.quantity), event: editItem.event, date: editItem.date?.slice(0, 10) || "" } : undefined}
        onSubmit={async (v) => { if (!editItem) return; await updateObligation.mutateAsync({ id: editItem.id, data: buildPayload(v) }); toast.success("Berhasil diperbarui"); setEditItem(null); }}
        loading={updateObligation.isPending} />

      <Dialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus Kewajiban</DialogTitle>
            <DialogDescription>Hapus kewajiban <strong>{deleteItem?.event}</strong>?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Batal</Button>
            <Button variant="destructive" disabled={deleteObligation.isPending} onClick={async () => {
              if (!deleteItem) return; await deleteObligation.mutateAsync(deleteItem.id); toast.success("Berhasil dihapus"); setDeleteItem(null);
            }}>{deleteObligation.isPending ? "Menghapus..." : "Hapus"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ObligationFormDialog({ open, onOpenChange, title, clans, animalTypes, defaultValues, onSubmit, loading }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; clans: Clan[]; animalTypes: AnimalType[];
  defaultValues?: FormValues; onSubmit: (v: FormValues) => Promise<void>; loading: boolean;
}) {
  const defaults: FormValues = defaultValues || { giver: "", receiver: "", paymentType: "money", animalType: "", moneyAmount: "", quantity: "1", event: "", date: "" };
  const methods = useForm<FormValues>({ defaultValues: defaults, values: defaults });
  const paymentType = methods.watch("paymentType");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <Form {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={methods.control} name="event" rules={{ required: "Wajib" }} render={({ field }) => (
              <FormItem><FormLabel>Nama Acara</FormLabel><FormControl><Input placeholder="Rambu Solo'..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              {(["giver", "receiver"] as const).map((key) => (
                <FormField key={key} control={methods.control} name={key} rules={{ required: "Wajib" }} render={({ field }) => (
                  <FormItem><FormLabel>{key === "giver" ? "Pemberi" : "Penerima"}</FormLabel><FormControl>
                    <select {...field} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                      <option value="">Pilih Clan</option>
                      {clans.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select></FormControl><FormMessage /></FormItem>
                )} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={methods.control} name="paymentType" render={({ field }) => (
                <FormItem><FormLabel>Jenis Aset</FormLabel><FormControl>
                  <select {...field} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="money">Uang</option><option value="animal">Hewan</option>
                  </select></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={methods.control} name="quantity" rules={{ required: "Wajib" }} render={({ field }) => (
                <FormItem><FormLabel>Kuantitas</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            {paymentType === "money" && (
              <FormField control={methods.control} name="moneyAmount" rules={{ required: "Wajib" }} render={({ field }) => (
                <FormItem><FormLabel>Jumlah Uang (Rp)</FormLabel><FormControl><Input type="number" placeholder="10000000" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            )}
            {paymentType === "animal" && (
              <FormField control={methods.control} name="animalType" rules={{ required: "Wajib" }} render={({ field }) => (
                <FormItem><FormLabel>Jenis Hewan</FormLabel><FormControl>
                  <select {...field} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">Pilih Hewan</option>
                    {animalTypes.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.breed})</option>)}
                  </select></FormControl><FormMessage /></FormItem>
              )} />
            )}
            <FormField control={methods.control} name="date" rules={{ required: "Wajib" }} render={({ field }) => (
              <FormItem><FormLabel>Tanggal</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
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
