import { useState } from "react";
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
import type { Group } from "@/db/types";

type FormValues = { name: string; eventName: string; description: string };

export default function GroupsScreen() {
  const { data, isLoading } = useLocalQuery<Group>("groups");
  const createGroup = useCreateDoc("groups");
  const updateGroup = useUpdateDoc("groups");
  const deleteGroup = useDeleteDoc("groups");

  const [editItem, setEditItem] = useState<Group | null>(null);
  const [deleteItem, setDeleteItem] = useState<Group | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const rows = data?.docs ?? [];

  const columns: ColumnDef<Group>[] = [
    { accessorKey: "name", header: "Nama Grup" },
    { accessorKey: "eventName", header: "Acara", cell: ({ row }) => row.original.eventName || "-" },
    { accessorKey: "description", header: "Deskripsi", cell: ({ row }) => (
      <span className="line-clamp-2 text-sm text-muted-foreground">{row.original.description || "-"}</span>
    )},
    { accessorKey: "members", header: "Anggota", cell: ({ row }) => `${row.original.members?.length || 0} clan` },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Grup</h1>
          <p className="text-sm text-muted-foreground">Kelompok untuk buku besar acara tertentu.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="size-4" /> Buat Grup
        </Button>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        searchableColumnIds={["name", "eventName"]}
        searchPlaceholder="Cari grup..."
        loading={isLoading}
        onEdit={(row) => setEditItem(row)}
        onDelete={(row) => setDeleteItem(row)}
        emptyMessage="Belum ada grup. Klik 'Buat Grup' untuk memulai."
      />

      <GroupFormDialog open={showCreate} onOpenChange={setShowCreate} title="Buat Grup Baru"
        onSubmit={async (values) => { await createGroup.mutateAsync(values); toast.success("Grup berhasil dibuat"); setShowCreate(false); }}
        loading={createGroup.isPending} />

      <GroupFormDialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)} title="Edit Grup"
        defaultValues={editItem ? { name: editItem.name, eventName: editItem.eventName || "", description: editItem.description || "" } : undefined}
        onSubmit={async (values) => { if (!editItem) return; await updateGroup.mutateAsync({ id: editItem.id, data: values }); toast.success("Grup berhasil diperbarui"); setEditItem(null); }}
        loading={updateGroup.isPending} />

      <Dialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus Grup</DialogTitle>
            <DialogDescription>Apakah Anda yakin ingin menghapus grup <strong>{deleteItem?.name}</strong>?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Batal</Button>
            <Button variant="destructive" disabled={deleteGroup.isPending} onClick={async () => {
              if (!deleteItem) return; await deleteGroup.mutateAsync(deleteItem.id); toast.success("Grup berhasil dihapus"); setDeleteItem(null);
            }}>{deleteGroup.isPending ? "Menghapus..." : "Hapus"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GroupFormDialog({ open, onOpenChange, title, defaultValues, onSubmit, loading }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string;
  defaultValues?: FormValues; onSubmit: (v: FormValues) => Promise<void>; loading: boolean;
}) {
  const defaults = defaultValues || { name: "", eventName: "", description: "" };
  const methods = useForm<FormValues>({ defaultValues: defaults, values: defaults });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <Form {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={methods.control} name="name" rules={{ required: "Nama wajib diisi" }} render={({ field }) => (
              <FormItem><FormLabel>Nama Grup</FormLabel><FormControl><Input placeholder="Rambu Solo' Kampung X" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={methods.control} name="eventName" render={({ field }) => (
              <FormItem><FormLabel>Nama Acara</FormLabel><FormControl><Input placeholder="Rambu Solo'" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={methods.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Deskripsi</FormLabel><FormControl><Textarea placeholder="Keterangan grup..." {...field} /></FormControl><FormMessage /></FormItem>
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
