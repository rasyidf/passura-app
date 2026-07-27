import { useState, useMemo } from "react";
import { useLocalQuery } from "@/hooks/useLocalQuery";
import { useCreateDoc, useUpdateDoc, useDeleteDoc } from "@/hooks/useLocalMutation";
import DataTable from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { AnimalType } from "@/db/types";
import { AnimalFormDialog } from "./AnimalFormDialog";
import { QUALITY_BADGE, type AnimalTypeFormValues } from "./animal-types.constants";

export default function AnimalTypesScreen() {
  const { data, isLoading } = useLocalQuery<AnimalType>("animal-types");
  const createAnimal = useCreateDoc("animal-types");
  const updateAnimal = useUpdateDoc("animal-types");
  const deleteAnimal = useDeleteDoc("animal-types");

  const [editItem, setEditItem] = useState<AnimalType | null>(null);
  const [deleteItem, setDeleteItem] = useState<AnimalType | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const rows = data?.docs ?? [];

  const columns: ColumnDef<AnimalType>[] = useMemo(
    () => [
      { accessorKey: "name", header: "Nama" },
      {
        accessorKey: "category",
        header: "Kategori",
        cell: ({ row }) => (row.original.category === "buffalo" ? "Kerbau" : "Babi"),
      },
      { accessorKey: "breed", header: "Ras" },
      {
        accessorKey: "quality",
        header: "Kualitas",
        cell: ({ row }) => {
          const q = QUALITY_BADGE[row.original.quality] ?? {
            label: row.original.quality,
            className: "bg-slate-100 text-slate-700 border-slate-200",
          };
          return <Badge variant="outline" className={q.className}>{q.label}</Badge>;
        },
      },
      {
        accessorKey: "price",
        header: "Harga (Rp)",
        cell: ({ row }) => `Rp ${(row.original.price || 0).toLocaleString("id-ID")}`,
      },
    ],
    [],
  );

  const filters = useMemo(
    () => [
      {
        id: "category",
        label: "Kategori",
        type: "segmented" as const,
        options: [
          { value: "buffalo", label: "Kerbau" },
          { value: "pig",     label: "Babi" },
        ],
      },
    ],
    [],
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold">Jenis Hewan</h1>
          <p className="text-sm text-muted-foreground">
            Kelola jenis kerbau dan babi beserta harga pasar.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="lg" className="gap-2">
          <Plus className="size-4" /> Tambah Jenis
        </Button>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        searchableColumnIds={["name", "breed", "quality"]}
        searchPlaceholder="Cari jenis hewan..."
        filters={filters}
        loading={isLoading}
        onEdit={(row) => setEditItem(row)}
        onDelete={(row) => setDeleteItem(row)}
        emptyMessage="Belum ada jenis hewan terdaftar."
      />

      {/* Create dialog */}
      <AnimalFormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        title="Tambah Jenis Hewan"
        onSubmit={async (v: AnimalTypeFormValues) => {
          await createAnimal.mutateAsync({ ...v, price: Number(v.price) });
          toast.success("Berhasil ditambahkan");
          setShowCreate(false);
        }}
        loading={createAnimal.isPending}
      />

      {/* Edit dialog */}
      <AnimalFormDialog
        open={!!editItem}
        onOpenChange={(o) => !o && setEditItem(null)}
        title="Edit Jenis Hewan"
        defaultValues={
          editItem
            ? {
                name: editItem.name,
                category: editItem.category,
                breed: editItem.breed,
                geneticLine: editItem.geneticLine || "",
                quality: editItem.quality,
                price: String(editItem.price),
              }
            : undefined
        }
        onSubmit={async (v: AnimalTypeFormValues) => {
          if (!editItem) return;
          await updateAnimal.mutateAsync({ id: editItem.id, data: { ...v, price: Number(v.price) } });
          toast.success("Berhasil diperbarui");
          setEditItem(null);
        }}
        loading={updateAnimal.isPending}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Jenis Hewan</DialogTitle>
            <DialogDescription>
              Hapus <strong>{deleteItem?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Batal</Button>
            <Button
              variant="destructive"
              disabled={deleteAnimal.isPending}
              onClick={async () => {
                if (!deleteItem) return;
                await deleteAnimal.mutateAsync(deleteItem.id);
                toast.success("Berhasil dihapus");
                setDeleteItem(null);
              }}
            >
              {deleteAnimal.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
