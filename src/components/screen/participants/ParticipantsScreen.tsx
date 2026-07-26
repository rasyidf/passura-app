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
import { Plus, Users } from "lucide-react";
import type { Participant, Clan } from "@/db/types";

type FormValues = { name: string; clan: string; role: string; notes: string };

export default function ParticipantsScreen() {
  const { data, isLoading } = useLocalQuery<Participant>("participants");
  const { data: clansData } = useLocalQuery<Clan>("clans");
  const createParticipant = useCreateDoc("participants");
  const updateParticipant = useUpdateDoc("participants");
  const deleteParticipant = useDeleteDoc("participants");

  const [editItem, setEditItem] = useState<Participant | null>(null);
  const [deleteItem, setDeleteItem] = useState<Participant | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filterClan, setFilterClan] = useState("");

  const clans = clansData?.docs ?? [];
  const rows = data?.docs ?? [];

  // Build clan name lookup
  const clanMap = useMemo(() => Object.fromEntries(clans.map((c) => [c.id, c.name])), [clans]);
  const nameOf = (id: string) => clanMap[id] || id;

  const filteredRows = filterClan ? rows.filter((r) => r.clan === filterClan) : rows;
  const roleLabels: Record<string, string> = { head: "Kepala", member: "Anggota", ancestor: "Leluhur" };

  const columns: ColumnDef<Participant>[] = useMemo(() => [
    { accessorKey: "name", header: "Nama" },
    { accessorKey: "clan", header: "Clan", cell: ({ row }) => nameOf(row.original.clan) },
    { accessorKey: "role", header: "Peran", cell: ({ row }) => roleLabels[row.original.role] || row.original.role },
    { accessorKey: "notes", header: "Catatan", cell: ({ row }) => row.original.notes || "-" },
  ], [clanMap]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><Users className="size-5" /> Silsilah / Peserta</h1>
          <p className="text-sm text-muted-foreground">Catatan peserta dan garis keturunan per clan.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="size-4" /> Tambah Peserta</Button>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Filter Clan:</label>
        <select value={filterClan} onChange={(e) => setFilterClan(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Semua Clan</option>
          {clans.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {filterClan && <Button size="sm" variant="ghost" onClick={() => setFilterClan("")}>Reset</Button>}
      </div>

      <DataTable
        data={filteredRows}
        columns={columns}
        searchableColumnIds={["name", "role"]}
        searchPlaceholder="Cari peserta..."
        loading={isLoading}
        onEdit={(row) => setEditItem(row)}
        onDelete={(row) => setDeleteItem(row)}
        emptyMessage="Belum ada peserta terdaftar."
      />

      <ParticipantFormDialog open={showCreate} onOpenChange={setShowCreate} title="Tambah Peserta" clans={clans}
        onSubmit={async (v) => { await createParticipant.mutateAsync(v); toast.success("Peserta berhasil ditambahkan"); setShowCreate(false); }}
        loading={createParticipant.isPending} />

      <ParticipantFormDialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)} title="Edit Peserta" clans={clans}
        defaultValues={editItem ? { name: editItem.name, clan: editItem.clan, role: editItem.role, notes: editItem.notes || "" } : undefined}
        onSubmit={async (v) => { if (!editItem) return; await updateParticipant.mutateAsync({ id: editItem.id, data: v }); toast.success("Berhasil diperbarui"); setEditItem(null); }}
        loading={updateParticipant.isPending} />

      <Dialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus Peserta</DialogTitle>
            <DialogDescription>Hapus <strong>{deleteItem?.name}</strong> dari silsilah?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Batal</Button>
            <Button variant="destructive" disabled={deleteParticipant.isPending} onClick={async () => {
              if (!deleteItem) return; await deleteParticipant.mutateAsync(deleteItem.id); toast.success("Berhasil dihapus"); setDeleteItem(null);
            }}>{deleteParticipant.isPending ? "Menghapus..." : "Hapus"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ParticipantFormDialog({ open, onOpenChange, title, clans, defaultValues, onSubmit, loading }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; clans: Clan[];
  defaultValues?: FormValues; onSubmit: (v: FormValues) => Promise<void>; loading: boolean;
}) {
  const defaults: FormValues = defaultValues || { name: "", clan: "", role: "member", notes: "" };
  const methods = useForm<FormValues>({ defaultValues: defaults, values: defaults });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <Form {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={methods.control} name="name" rules={{ required: "Wajib" }} render={({ field }) => (
              <FormItem><FormLabel>Nama</FormLabel><FormControl><Input placeholder="Nama peserta" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={methods.control} name="clan" rules={{ required: "Wajib" }} render={({ field }) => (
              <FormItem><FormLabel>Clan</FormLabel><FormControl>
                <select {...field} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Pilih Clan</option>
                  {clans.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={methods.control} name="role" render={({ field }) => (
              <FormItem><FormLabel>Peran</FormLabel><FormControl>
                <select {...field} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="head">Kepala</option><option value="member">Anggota</option><option value="ancestor">Leluhur</option>
                </select></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={methods.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Catatan</FormLabel><FormControl><Textarea placeholder="Opsional..." {...field} /></FormControl><FormMessage /></FormItem>
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
