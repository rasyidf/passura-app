import { useState, useMemo } from "react";
import { useLocalQuery } from "@/hooks/useLocalQuery";
import { useCreateDoc, useUpdateDoc, useDeleteDoc } from "@/hooks/useLocalMutation";
import { useForm, Controller } from "react-hook-form";
import DataTable from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import type { AnimalType } from "@/db/types";
import { Badge } from "@/components/ui/badge";

const QUALITY_BADGE: Record<string, { label: string; className: string }> = {
  low:    { label: "Rendah",     className: "bg-slate-100 text-slate-700 border-slate-200" },
  medium: { label: "Sedang",     className: "bg-blue-100 text-blue-700 border-blue-200" },
  high:   { label: "Tinggi",     className: "bg-green-100 text-green-700 border-green-200" },
  unique: { label: "Unik/Langka", className: "bg-purple-100 text-purple-700 border-purple-200" },
};

type FormValues = { name: string; category: string; breed: string; geneticLine: string; quality: string; price: string };

export default function AnimalTypesScreen() {
  const { data, isLoading } = useLocalQuery<AnimalType>("animal-types");
  const createAnimal = useCreateDoc("animal-types");
  const updateAnimal = useUpdateDoc("animal-types");
  const deleteAnimal = useDeleteDoc("animal-types");

  const [editItem, setEditItem] = useState<AnimalType | null>(null);
  const [deleteItem, setDeleteItem] = useState<AnimalType | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const rows = data?.docs ?? [];

  const columns: ColumnDef<AnimalType>[] = useMemo(() => [
    { accessorKey: "name", header: "Nama" },
    { accessorKey: "category", header: "Kategori", cell: ({ row }) => row.original.category === "buffalo" ? "Kerbau" : "Babi" },
    { accessorKey: "breed", header: "Ras" },
    { accessorKey: "quality", header: "Kualitas", cell: ({ row }) => {
      const q = QUALITY_BADGE[row.original.quality] ?? { label: row.original.quality, className: "bg-slate-100 text-slate-700 border-slate-200" };
      return <Badge variant="outline" className={q.className}>{q.label}</Badge>;
    }},
    { accessorKey: "price", header: "Harga (Rp)", cell: ({ row }) => `Rp ${(row.original.price || 0).toLocaleString("id-ID")}` },
  ], []);

  const filters = useMemo(() => [{
    id: "category", label: "Kategori", type: "segmented" as const,
    options: [{ value: "buffalo", label: "Kerbau" }, { value: "pig", label: "Babi" }],
  }], []);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold">Jenis Hewan</h1>
          <p className="text-sm text-muted-foreground">Kelola jenis kerbau dan babi beserta harga pasar.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="size-4" /> Tambah Jenis</Button>
      </div>

      <DataTable data={rows} columns={columns} searchableColumnIds={["name", "breed", "quality"]}
        searchPlaceholder="Cari jenis hewan..." filters={filters} loading={isLoading}
        onEdit={(row) => setEditItem(row)} onDelete={(row) => setDeleteItem(row)}
        emptyMessage="Belum ada jenis hewan terdaftar." />

      <AnimalFormDialog open={showCreate} onOpenChange={setShowCreate} title="Tambah Jenis Hewan"
        onSubmit={async (v) => { await createAnimal.mutateAsync({ ...v, price: Number(v.price) }); toast.success("Berhasil ditambahkan"); setShowCreate(false); }}
        loading={createAnimal.isPending} />

      <AnimalFormDialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)} title="Edit Jenis Hewan"
        defaultValues={editItem ? { name: editItem.name, category: editItem.category, breed: editItem.breed, geneticLine: editItem.geneticLine || "", quality: editItem.quality, price: String(editItem.price) } : undefined}
        onSubmit={async (v) => { if (!editItem) return; await updateAnimal.mutateAsync({ id: editItem.id, data: { ...v, price: Number(v.price) } }); toast.success("Berhasil diperbarui"); setEditItem(null); }}
        loading={updateAnimal.isPending} />

      <Dialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus Jenis Hewan</DialogTitle>
            <DialogDescription>Hapus <strong>{deleteItem?.name}</strong>?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Batal</Button>
            <Button variant="destructive" disabled={deleteAnimal.isPending} onClick={async () => {
              if (!deleteItem) return; await deleteAnimal.mutateAsync(deleteItem.id); toast.success("Berhasil dihapus"); setDeleteItem(null);
            }}>{deleteAnimal.isPending ? "Menghapus..." : "Hapus"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AnimalFormDialog({ open, onOpenChange, title, defaultValues, onSubmit, loading }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string;
  defaultValues?: FormValues; onSubmit: (v: FormValues) => Promise<void>; loading: boolean;
}) {
  const defaults: FormValues = defaultValues || { name: "", category: "buffalo", breed: "", geneticLine: "", quality: "medium", price: "" };
  const { control, handleSubmit } = useForm<FormValues>({ defaultValues: defaults, values: defaults });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Controller control={control} name="name" rules={{ required: "Wajib" }} render={({ field, fieldState }) => (
            <Field><FieldLabel>Nama</FieldLabel><Input placeholder="Tedong Bonga" {...field} /><FieldError>{fieldState.error?.message}</FieldError></Field>
          )} />
          <div className="grid grid-cols-2 gap-4">
            <Controller control={control} name="category" render={({ field }) => (
              <Field><FieldLabel>Kategori</FieldLabel>
                <NativeSelect {...field}>
                  <NativeSelectOption value="buffalo">Kerbau</NativeSelectOption>
                  <NativeSelectOption value="pig">Babi</NativeSelectOption>
                </NativeSelect>
              </Field>
            )} />
            <Controller control={control} name="quality" render={({ field }) => (
              <Field><FieldLabel>Kualitas</FieldLabel>
                <NativeSelect {...field}>
                  <NativeSelectOption value="low">Rendah</NativeSelectOption>
                  <NativeSelectOption value="medium">Sedang</NativeSelectOption>
                  <NativeSelectOption value="high">Tinggi</NativeSelectOption>
                  <NativeSelectOption value="unique">Unik/Langka</NativeSelectOption>
                </NativeSelect>
              </Field>
            )} />
          </div>
          <Controller control={control} name="breed" rules={{ required: "Wajib" }} render={({ field, fieldState }) => (
            <Field><FieldLabel>Ras / Breed</FieldLabel><Input placeholder="Bonga, Saleko..." {...field} /><FieldError>{fieldState.error?.message}</FieldError></Field>
          )} />
          <Controller control={control} name="geneticLine" render={({ field }) => (
            <Field><FieldLabel>Garis Keturunan</FieldLabel><Input placeholder="Noble, common..." {...field} /></Field>
          )} />
          <Controller control={control} name="price" rules={{ required: "Wajib" }} render={({ field, fieldState }) => (
            <Field><FieldLabel>Harga (Rp)</FieldLabel><Input type="number" placeholder="80000000" {...field} /><FieldError>{fieldState.error?.message}</FieldError></Field>
          )} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
