import { useState, useMemo } from "react";
import { useLocalQuery } from "@/hooks/useLocalQuery";
import { useCreateDoc, useUpdateDoc, useDeleteDoc } from "@/hooks/useLocalMutation";
import { useForm, Controller } from "react-hook-form";
import DataTable from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { RelationshipInput } from "@/components/ui/relationship-input";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Handover, Clan, AnimalType } from "@/db/types";
import { MoneyCell } from "@/components/ui/money-cell";

const OBLIGATION_BADGE: Record<string, { label: string; className: string }> = {
  ritual:   { label: "Ritual",      className: "bg-amber-100 text-amber-700 border-amber-200" },
  social:   { label: "Sosial",      className: "bg-sky-100 text-sky-700 border-sky-200" },
  wedding:  { label: "Pernikahan",  className: "bg-pink-100 text-pink-700 border-pink-200" },
  funeral:  { label: "Pemakaman",   className: "bg-slate-100 text-slate-700 border-slate-200" },
  other:    { label: "Lainnya",     className: "bg-gray-100 text-gray-600 border-gray-200" },
};

const ASSET_BADGE: Record<string, { label: string; className: string }> = {
  money:  { label: "Uang",  className: "bg-green-100 text-green-700 border-green-200" },
  animal: { label: "Hewan", className: "bg-orange-100 text-orange-700 border-orange-200" },
};

type FormValues = {
  fromClan: string; toClan: string; assetType: string; obligationType: string;
  moneyAmount: string; animalType: string; quantity: string; date: string; notes: string;
};

const OBLIGATION_TYPES = [
  { value: "ritual", label: "Ritual" }, { value: "social", label: "Sosial" },
  { value: "wedding", label: "Pernikahan" }, { value: "funeral", label: "Pemakaman" },
  { value: "other", label: "Lainnya" },
];

/** Inline clan name shown as a link to /dashboard/clans */
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

/** Inline animal type name shown as a link to /dashboard/animal-types */
function AnimalLink({ id, name }: { id: string; name: string }) {
  return (
    <Link
      to="/dashboard/animal-types"
      className="inline-flex items-center gap-1 text-primary hover:underline underline-offset-2 text-sm"
      onClick={(e) => e.stopPropagation()}
    >
      {name || id}
      <ExternalLink className="size-3 opacity-60" />
    </Link>
  );
}

export default function HandoversScreen() {
  const { data, isLoading } = useLocalQuery<Handover>("handovers");
  const { data: clansData } = useLocalQuery<Clan>("clans");
  const { data: animalsData } = useLocalQuery<AnimalType>("animal-types");
  const createHandover = useCreateDoc("handovers");
  const updateHandover = useUpdateDoc("handovers");
  const deleteHandover = useDeleteDoc("handovers");

  const [editItem, setEditItem] = useState<Handover | null>(null);
  const [deleteItem, setDeleteItem] = useState<Handover | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const clans = clansData?.docs ?? [];
  const animalTypes = animalsData?.docs ?? [];
  const rows = data?.docs ?? [];

  const clanMap = useMemo(() => Object.fromEntries(clans.map((c) => [c.id, c.name])), [clans]);
  const animalMap = useMemo(() => Object.fromEntries(animalTypes.map((a) => [a.id, a.name])), [animalTypes]);

  const columns: ColumnDef<Handover>[] = useMemo(() => [
    { accessorKey: "date", header: "Tanggal", filterFn: "dateRange" as any, cell: ({ row }) => row.original.date?.slice(0, 10) || "-" },
    {
      accessorKey: "fromClan",
      header: "Dari",
      cell: ({ row }) => <ClanLink id={row.original.fromClan} name={clanMap[row.original.fromClan] ?? row.original.fromClan} />,
    },
    {
      accessorKey: "toClan",
      header: "Ke",
      cell: ({ row }) => <ClanLink id={row.original.toClan} name={clanMap[row.original.toClan] ?? row.original.toClan} />,
    },
    {
      accessorKey: "obligationType",
      header: "Jenis",
      cell: ({ row }) => {
        const b = OBLIGATION_BADGE[row.original.obligationType] ?? { label: row.original.obligationType, className: "bg-gray-100 text-gray-600 border-gray-200" };
        return <Badge variant="outline" className={b.className}>{b.label}</Badge>;
      },
    },
    {
      accessorKey: "assetType",
      header: "Aset",
      cell: ({ row }) => {
        const b = ASSET_BADGE[row.original.assetType] ?? { label: row.original.assetType, className: "bg-gray-100 text-gray-600 border-gray-200" };
        const badge = <Badge variant="outline" className={b.className}>{b.label}</Badge>;
        if (row.original.assetType === "animal" && row.original.animalType) {
          return (
            <div className="flex items-center gap-1.5">
              {badge}
              <AnimalLink id={row.original.animalType} name={animalMap[row.original.animalType] ?? row.original.animalType} />
            </div>
          );
        }
        return badge;
      },
    },
    {
      accessorKey: "calculatedValue",
      header: "Nilai",
      cell: ({ row }) => <MoneyCell value={row.original.calculatedValue} />,
    },
  ], [clanMap, animalMap]);

  const filters = useMemo(() => [
    { id: "date", label: "Tanggal", type: "daterange" as const },
    { id: "obligationType", label: "Jenis", type: "select" as const, options: OBLIGATION_TYPES },
  ], []);

  const buildPayload = (v: FormValues) => {
    const p: Record<string, unknown> = { fromClan: v.fromClan, toClan: v.toClan, assetType: v.assetType, obligationType: v.obligationType, date: v.date, notes: v.notes || undefined };
    if (v.assetType === "money") p.moneyAmount = Number(v.moneyAmount) || 0;
    if (v.assetType === "animal") { p.animalType = v.animalType; p.quantity = Number(v.quantity) || 1; }
    return p;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Penyerahan</h1>
          <p className="text-sm text-muted-foreground">Catatan penyerahan donasi ke rumpun keluarga lain.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="lg" className="gap-2"><Plus className="size-4" /> Catat Penyerahan</Button>
      </div>

      <DataTable
        data={rows} columns={columns} searchableColumnIds={["obligationType"]}
        searchPlaceholder="Cari penyerahan..." filters={filters} loading={isLoading}
        onEdit={(r) => setEditItem(r)} onDelete={(r) => setDeleteItem(r)}
        emptyMessage="Belum ada data penyerahan."
      />

      <HandoverFormDialog
        open={showCreate} onOpenChange={setShowCreate} title="Catat Penyerahan Baru"
        clans={clans} animalTypes={animalTypes}
        onSubmit={async (v) => { await createHandover.mutateAsync(buildPayload(v)); toast.success("Penyerahan berhasil dicatat"); setShowCreate(false); }}
        loading={createHandover.isPending}
      />

      <HandoverFormDialog
        open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)} title="Edit Penyerahan"
        clans={clans} animalTypes={animalTypes}
        defaultValues={editItem ? {
          fromClan: editItem.fromClan, toClan: editItem.toClan, assetType: editItem.assetType,
          obligationType: editItem.obligationType, moneyAmount: String(editItem.moneyAmount || ""),
          animalType: editItem.animalType || "", quantity: String(editItem.quantity || ""),
          date: editItem.date?.slice(0, 10) || "", notes: editItem.notes || "",
        } : undefined}
        onSubmit={async (v) => {
          if (!editItem) return;
          await updateHandover.mutateAsync({ id: editItem.id, data: buildPayload(v) });
          toast.success("Berhasil diperbarui");
          setEditItem(null);
        }}
        loading={updateHandover.isPending}
      />

      <Dialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Penyerahan</DialogTitle>
            <DialogDescription>Hapus catatan penyerahan ini?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Batal</Button>
            <Button variant="destructive" disabled={deleteHandover.isPending} onClick={async () => {
              if (!deleteItem) return;
              await deleteHandover.mutateAsync(deleteItem.id);
              toast.success("Berhasil dihapus");
              setDeleteItem(null);
            }}>{deleteHandover.isPending ? "Menghapus..." : "Hapus"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HandoverFormDialog({ open, onOpenChange, title, clans, animalTypes, defaultValues, onSubmit, loading }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string;
  clans: Clan[]; animalTypes: AnimalType[];
  defaultValues?: FormValues; onSubmit: (v: FormValues) => Promise<void>; loading: boolean;
}) {
  const defaults: FormValues = defaultValues || {
    fromClan: "", toClan: "", assetType: "money", obligationType: "ritual",
    moneyAmount: "", animalType: "", quantity: "", date: "", notes: "",
  };
  const { control, handleSubmit, watch } = useForm<FormValues>({ defaultValues: defaults, values: defaults });
  const assetType = watch("assetType");

  const clanOptions = useMemo(() => clans.map((c) => ({
    value: c.id, label: c.name, description: c.region,
  })), [clans]);

  const animalOptions = useMemo(() => animalTypes.map((a) => ({
    value: a.id, label: a.name, description: `${a.breed} — ${a.quality}`,
  })), [animalTypes]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {(["fromClan", "toClan"] as const).map((key) => (
                <Controller key={key} control={control} name={key} rules={{ required: "Wajib" }} render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>{key === "fromClan" ? "Dari Rumpun" : "Ke Rumpun"}</FieldLabel>
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
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Controller control={control} name="obligationType" render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Jenis Kewajiban</FieldLabel>
                  <NativeSelect {...field} id={field.name}>
                    {OBLIGATION_TYPES.map((o) => <NativeSelectOption key={o.value} value={o.value}>{o.label}</NativeSelectOption>)}
                  </NativeSelect>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />
              <Controller control={control} name="assetType" render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Jenis Aset</FieldLabel>
                  <NativeSelect {...field} id={field.name}>
                    <NativeSelectOption value="money">Uang</NativeSelectOption>
                    <NativeSelectOption value="animal">Hewan</NativeSelectOption>
                  </NativeSelect>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />
            </div>

            {assetType === "money" && (
              <Controller control={control} name="moneyAmount" rules={{ required: "Wajib" }} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Jumlah Uang (Rp)</FieldLabel>
                  <Input id={field.name} type="number" placeholder="10000000" aria-invalid={fieldState.invalid} {...field} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />
            )}

            {assetType === "animal" && (
              <div className="grid grid-cols-2 gap-4">
                <Controller control={control} name="animalType" rules={{ required: "Wajib" }} render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Jenis Hewan</FieldLabel>
                    <RelationshipInput
                      options={animalOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Pilih hewan..."
                      searchPlaceholder="Cari hewan..."
                      emptyMessage="Hewan tidak ditemukan."
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )} />
                <Controller control={control} name="quantity" rules={{ required: "Wajib" }} render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Kuantitas</FieldLabel>
                    <Input id={field.name} type="number" min="1" placeholder="1" aria-invalid={fieldState.invalid} {...field} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )} />
              </div>
            )}

            <Controller control={control} name="date" rules={{ required: "Wajib" }} render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Tanggal</FieldLabel>
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )} />
            <Controller control={control} name="notes" render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Keterangan</FieldLabel>
                <Textarea id={field.name} placeholder="Catatan opsional..." aria-invalid={fieldState.invalid} {...field} />
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


