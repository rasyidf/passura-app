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
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Receipt, Clan, AnimalType } from "@/db/types";

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

const SETTLEMENT_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "Tertunda", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  partial: { label: "Sebagian", className: "bg-blue-100 text-blue-700 border-blue-200" },
  settled: { label: "Lunas",    className: "bg-green-100 text-green-700 border-green-200" },
};

type FormValues = {
  receiver: string; giver: string; assetType: string; obligationType: string;
  moneyAmount: string; animalType: string; quantity: string; dateReceived: string; notes: string;
};

const OBLIGATION_TYPES = [
  { value: "ritual", label: "Ritual" }, { value: "social", label: "Sosial" },
  { value: "wedding", label: "Pernikahan" }, { value: "funeral", label: "Pemakaman" },
  { value: "other", label: "Lainnya" },
];

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
  const animalMap = useMemo(() => Object.fromEntries(animalTypes.map((a) => [a.id, a.name])), [animalTypes]);

  const columns: ColumnDef<Receipt>[] = useMemo(() => [
    { accessorKey: "dateReceived", header: "Tanggal", cell: ({ row }) => row.original.dateReceived?.slice(0, 10) || "-" },
    {
      accessorKey: "receiver",
      header: "Penerima",
      cell: ({ row }) => <ClanLink id={row.original.receiver} name={clanMap[row.original.receiver] ?? row.original.receiver} />,
    },
    {
      accessorKey: "giver",
      header: "Pemberi",
      cell: ({ row }) => <ClanLink id={row.original.giver} name={clanMap[row.original.giver] ?? row.original.giver} />,
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
      header: "Nilai (Rp)",
      cell: ({ row }) => `Rp ${(row.original.calculatedValue || 0).toLocaleString("id-ID")}`,
    },
    {
      accessorKey: "settlementStatus",
      header: "Status",
      cell: ({ row }) => {
        const b = SETTLEMENT_BADGE[row.original.settlementStatus] ?? { label: row.original.settlementStatus, className: "bg-gray-100 text-gray-600 border-gray-200" };
        return <Badge variant="outline" className={b.className}>{b.label}</Badge>;
      },
    },
  ], [clanMap, animalMap]);

  const filters = useMemo(() => [
    { id: "obligationType", label: "Jenis", type: "select" as const, options: OBLIGATION_TYPES },
    { id: "settlementStatus", label: "Status", type: "segmented" as const, options: [
      { value: "pending", label: "Pending" }, { value: "partial", label: "Sebagian" }, { value: "settled", label: "Lunas" },
    ]},
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

      <DataTable
        data={rows} columns={columns} searchableColumnIds={["obligationType"]}
        searchPlaceholder="Cari penerimaan..." filters={filters} loading={isLoading}
        onEdit={(r) => setEditItem(r)} onDelete={(r) => setDeleteItem(r)}
        emptyMessage="Belum ada data penerimaan."
      />

      <ReceiptFormDialog
        open={showCreate} onOpenChange={setShowCreate} title="Catat Penerimaan Baru"
        clans={clans} animalTypes={animalTypes}
        onSubmit={async (v) => { await createReceipt.mutateAsync(buildPayload(v)); toast.success("Penerimaan berhasil dicatat"); setShowCreate(false); }}
        loading={createReceipt.isPending}
      />

      <ReceiptFormDialog
        open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)} title="Edit Penerimaan"
        clans={clans} animalTypes={animalTypes}
        defaultValues={editItem ? {
          receiver: editItem.receiver, giver: editItem.giver, assetType: editItem.assetType,
          obligationType: editItem.obligationType, moneyAmount: String(editItem.moneyAmount || ""),
          animalType: editItem.animalType || "", quantity: String(editItem.quantity || ""),
          dateReceived: editItem.dateReceived?.slice(0, 10) || "", notes: editItem.notes || "",
        } : undefined}
        onSubmit={async (v) => {
          if (!editItem) return;
          await updateReceipt.mutateAsync({ id: editItem.id, data: buildPayload(v) });
          toast.success("Berhasil diperbarui");
          setEditItem(null);
        }}
        loading={updateReceipt.isPending}
      />

      <Dialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Penerimaan</DialogTitle>
            <DialogDescription>Hapus catatan penerimaan ini?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Batal</Button>
            <Button variant="destructive" disabled={deleteReceipt.isPending} onClick={async () => {
              if (!deleteItem) return;
              await deleteReceipt.mutateAsync(deleteItem.id);
              toast.success("Berhasil dihapus");
              setDeleteItem(null);
            }}>{deleteReceipt.isPending ? "Menghapus..." : "Hapus"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReceiptFormDialog({ open, onOpenChange, title, clans, animalTypes, defaultValues, onSubmit, loading }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string;
  clans: Clan[]; animalTypes: AnimalType[];
  defaultValues?: FormValues; onSubmit: (v: FormValues) => Promise<void>; loading: boolean;
}) {
  const defaults: FormValues = defaultValues || {
    receiver: "", giver: "", assetType: "money", obligationType: "ritual",
    moneyAmount: "", animalType: "", quantity: "", dateReceived: "", notes: "",
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
              {(["receiver", "giver"] as const).map((key) => (
                <Controller key={key} control={control} name={key} rules={{ required: "Wajib" }} render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>{key === "receiver" ? "Penerima" : "Pemberi"}</FieldLabel>
                    <RelationshipInput
                      options={clanOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Pilih clan..."
                      searchPlaceholder="Cari clan..."
                      emptyMessage="Clan tidak ditemukan."
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
                    <FieldLabel htmlFor={field.name}>Jenis Hewan</FieldLabel>
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

            <Controller control={control} name="dateReceived" rules={{ required: "Wajib" }} render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Tanggal Diterima</FieldLabel>
                <Input id={field.name} type="date" aria-invalid={fieldState.invalid} {...field} />
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


