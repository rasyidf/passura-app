import { useState, useMemo } from "react";
import { useLocalQuery } from "@/hooks/useLocalQuery";
import { useCreateDoc, useUpdateDoc, useDeleteDoc } from "@/hooks/useLocalMutation";
import { useForm } from "react-hook-form";
import DataTable from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Form, FormItem, FormLabel, FormControl, FormMessage, FormField } from "@/components/ui/form";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import type { Clan } from "@/db/types";

type FormValues = { name: string; region: string };

export default function ClansScreen() {
  const { data, isLoading } = useLocalQuery<Clan>("clans");
  const createClan = useCreateDoc("clans");
  const updateClan = useUpdateDoc("clans");
  const deleteClan = useDeleteDoc("clans");

  const [editItem, setEditItem] = useState<Clan | null>(null);
  const [deleteItem, setDeleteItem] = useState<Clan | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const rows = data?.docs ?? [];

  const columns: ColumnDef<Clan>[] = useMemo(() => [
    { accessorKey: "name", header: "Nama Clan" },
    { accessorKey: "region", header: "Wilayah", cell: ({ row }) => row.original.region || "-" },
  ], []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Clan / Rumpun Keluarga</h1>
          <p className="text-sm text-muted-foreground">Kelola data clan yang terdaftar dalam sistem Passura.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="size-4" /> Tambah Clan
        </Button>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        searchableColumnIds={["name", "region"]}
        searchPlaceholder="Cari clan..."
        loading={isLoading}
        onEdit={(row) => setEditItem(row)}
        onDelete={(row) => setDeleteItem(row)}
        emptyMessage="Belum ada clan terdaftar."
      />

      <ClanFormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        title="Tambah Clan Baru"
        onSubmit={async (values) => {
          await createClan.mutateAsync(values);
          toast.success("Clan berhasil ditambahkan");
          setShowCreate(false);
        }}
        loading={createClan.isPending}
      />

      <ClanFormDialog
        open={!!editItem}
        onOpenChange={(open) => !open && setEditItem(null)}
        title="Edit Clan"
        defaultValues={editItem ? { name: editItem.name, region: editItem.region || "" } : undefined}
        onSubmit={async (values) => {
          if (!editItem) return;
          await updateClan.mutateAsync({ id: editItem.id, data: values });
          toast.success("Clan berhasil diperbarui");
          setEditItem(null);
        }}
        loading={updateClan.isPending}
      />

      <Dialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Clan</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus clan <strong>{deleteItem?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Batal</Button>
            <Button variant="destructive" disabled={deleteClan.isPending} onClick={async () => {
              if (!deleteItem) return;
              await deleteClan.mutateAsync(deleteItem.id);
              toast.success("Clan berhasil dihapus");
              setDeleteItem(null);
            }}>
              {deleteClan.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClanFormDialog({ open, onOpenChange, title, defaultValues, onSubmit, loading }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string;
  defaultValues?: FormValues; onSubmit: (v: FormValues) => Promise<void>; loading: boolean;
}) {
  const defaults = defaultValues || { name: "", region: "" };
  const methods = useForm<FormValues>({ defaultValues: defaults, values: defaults });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <Form {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={methods.control} name="name" rules={{ required: "Nama wajib diisi" }} render={({ field }) => (
              <FormItem><FormLabel>Nama Clan</FormLabel><FormControl><Input placeholder="Tongkonan Rante" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={methods.control} name="region" render={({ field }) => (
              <FormItem><FormLabel>Wilayah</FormLabel><FormControl><Input placeholder="Rantepao, Makale, dll." {...field} /></FormControl><FormMessage /></FormItem>
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
