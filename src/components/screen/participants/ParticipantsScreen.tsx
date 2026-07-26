import { useState, useMemo } from "react";
import { useLocalQuery } from "@/hooks/useLocalQuery";
import { useCreateDoc, useUpdateDoc, useDeleteDoc } from "@/hooks/useLocalMutation";
import { useForm, Controller } from "react-hook-form";
import DataTable from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { RelationshipInput } from "@/components/ui/relationship-input";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Participant, Clan } from "@/db/types";

type FormValues = { name: string; clan: string; role: string; notes: string };

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  head:     { label: "Kepala",  className: "bg-amber-100 text-amber-700 border-amber-200" },
  member:   { label: "Anggota", className: "bg-sky-100 text-sky-700 border-sky-200" },
  ancestor: { label: "Leluhur", className: "bg-purple-100 text-purple-700 border-purple-200" },
};

export default function ParticipantsScreen() {
  const { data, isLoading } = useLocalQuery<Participant>("participants");
  const { data: clansData } = useLocalQuery<Clan>("clans");
  const createParticipant = useCreateDoc("participants");
  const updateParticipant = useUpdateDoc("participants");
  const deleteParticipant = useDeleteDoc("participants");

  const [editItem, setEditItem] = useState<Participant | null>(null);
  const [deleteItem, setDeleteItem] = useState<Participant | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const clans = clansData?.docs ?? [];
  const rows = data?.docs ?? [];

  const clanMap = useMemo(() => Object.fromEntries(clans.map((c) => [c.id, c.name])), [clans]);

  const filteredRows = rows; // filtering handled by DataTable

  const columns: ColumnDef<Participant>[] = useMemo(() => [
    { accessorKey: "name", header: "Nama", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    {
      accessorKey: "clan",
      header: "Rumpun",
      filterFn: "multiSelect" as any,
      cell: ({ row }) => {
        const name = clanMap[row.original.clan] ?? row.original.clan;
        return (
          <Link
            to="/dashboard/clans"
            className="inline-flex items-center gap-1 text-primary hover:underline underline-offset-2 text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {name}
            <ExternalLink className="size-3 opacity-60" />
          </Link>
        );
      },
    },
    {
      accessorKey: "role",
      header: "Peran",
      cell: ({ row }) => {
        const b = ROLE_BADGE[row.original.role] ?? { label: row.original.role, className: "bg-gray-100 text-gray-600 border-gray-200" };
        return <Badge variant="outline" className={b.className}>{b.label}</Badge>;
      },
    },
    { accessorKey: "notes", header: "Catatan", cell: ({ row }) => row.original.notes || "-" },
  ], [clanMap]);

  const clanOptions = useMemo(() => clans.map((c) => ({
    value: c.id, label: c.name, description: c.region,
  })), [clans]);

  const clanFilterOptions = useMemo(() => clans.map((c) => ({
    value: c.id, label: c.name,
  })), [clans]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold">Silsilah / Peserta</h1>
          <p className="text-sm text-muted-foreground">Catatan peserta dan garis keturunan per rumpun keluarga.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="lg" className="gap-2"><Plus className="size-4" /> Tambah Peserta</Button>
      </div>

      <DataTable
        data={filteredRows}
        columns={columns}
        searchableColumnIds={["name", "role"]}
        searchPlaceholder="Cari peserta..."
        filters={[{ id: "clan", label: "Rumpun", type: "multiselect", options: clanFilterOptions, placeholder: "Semua Rumpun" }]}
        loading={isLoading}
        onEdit={(row) => setEditItem(row)}
        onDelete={(row) => setDeleteItem(row)}
        emptyMessage="Belum ada peserta terdaftar."
      />

      <ParticipantFormDialog
        open={showCreate} onOpenChange={setShowCreate} title="Tambah Peserta"
        clanOptions={clanOptions}
        onSubmit={async (v) => { await createParticipant.mutateAsync(v); toast.success("Peserta berhasil ditambahkan"); setShowCreate(false); }}
        loading={createParticipant.isPending}
      />

      <ParticipantFormDialog
        open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)} title="Edit Peserta"
        clanOptions={clanOptions}
        defaultValues={editItem ? { name: editItem.name, clan: editItem.clan, role: editItem.role, notes: editItem.notes || "" } : undefined}
        onSubmit={async (v) => {
          if (!editItem) return;
          await updateParticipant.mutateAsync({ id: editItem.id, data: v });
          toast.success("Berhasil diperbarui");
          setEditItem(null);
        }}
        loading={updateParticipant.isPending}
      />

      <Dialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Peserta</DialogTitle>
            <DialogDescription>Hapus <strong>{deleteItem?.name}</strong> dari silsilah?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Batal</Button>
            <Button variant="destructive" disabled={deleteParticipant.isPending} onClick={async () => {
              if (!deleteItem) return;
              await deleteParticipant.mutateAsync(deleteItem.id);
              toast.success("Berhasil dihapus");
              setDeleteItem(null);
            }}>{deleteParticipant.isPending ? "Menghapus..." : "Hapus"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ParticipantFormDialog({ open, onOpenChange, title, clanOptions, defaultValues, onSubmit, loading }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string;
  clanOptions: { value: string; label: string; description?: string }[];
  defaultValues?: FormValues; onSubmit: (v: FormValues) => Promise<void>; loading: boolean;
}) {
  const defaults: FormValues = defaultValues || { name: "", clan: "", role: "member", notes: "" };
  const { control, handleSubmit } = useForm<FormValues>({ defaultValues: defaults, values: defaults });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Controller control={control} name="name" rules={{ required: "Wajib" }} render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Nama</FieldLabel>
                <Input id={field.name} placeholder="Nama peserta" aria-invalid={fieldState.invalid} {...field} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )} />
            <Controller control={control} name="clan" rules={{ required: "Wajib" }} render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Rumpun</FieldLabel>
                <RelationshipInput
                  options={clanOptions}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Pilih rumpun..."
                  searchPlaceholder="Cari rumpun..."
                  emptyMessage="Rumpun tidak ditemukan."
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )} />
            <Controller control={control} name="role" render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Peran</FieldLabel>
                <NativeSelect {...field} id={field.name}>
                  <NativeSelectOption value="head">Kepala</NativeSelectOption>
                  <NativeSelectOption value="member">Anggota</NativeSelectOption>
                  <NativeSelectOption value="ancestor">Leluhur</NativeSelectOption>
                </NativeSelect>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )} />
            <Controller control={control} name="notes" render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Catatan</FieldLabel>
                <Textarea id={field.name} placeholder="Opsional..." aria-invalid={fieldState.invalid} {...field} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
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
