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
import { RelationshipInput } from "@/components/ui/relationship-input";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Obligation, Clan, AnimalType } from "@/db/types";
import { MoneyCell } from "@/components/ui/money-cell";

const ASSET_BADGE: Record<string, { label: string; className: string }> = {
  money:  { label: "Uang",  className: "bg-green-100 text-green-700 border-green-200" },
  animal: { label: "Hewan", className: "bg-orange-100 text-orange-700 border-orange-200" },
};

type FormValues = {
  giver: string; receiver: string; paymentType: string;
  animalType: string; moneyAmount: string; quantity: string; event: string; date: string;
};

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
  const animalMap = useMemo(() => Object.fromEntries(animalTypes.map((a) => [a.id, a.name])), [animalTypes]);

  const columns: ColumnDef<Obligation>[] = useMemo(() => [
    { accessorKey: "event", header: "Acara" },
    { accessorKey: "date", header: "Tanggal", filterFn: "dateRange" as any, cell: ({ row }) => row.original.date?.slice(0, 10) || "-" },
    {
      accessorKey: "giver",
      header: "Pemberi",
      cell: ({ row }) => <ClanLink id={row.original.giver} name={clanMap[row.original.giver] ?? row.original.giver} />,
    },
    {
      accessorKey: "receiver",
      header: "Penerima",
      cell: ({ row }) => <ClanLink id={row.original.receiver} name={clanMap[row.original.receiver] ?? row.original.receiver} />,
    },
    {
      accessorKey: "paymentType",
      header: "Jenis",
      cell: ({ row }) => {
        const b = ASSET_BADGE[row.original.paymentType] ?? { label: row.original.paymentType, className: "bg-gray-100 text-gray-600 border-gray-200" };
        const badge = <Badge variant="outline" className={b.className}>{b.label}</Badge>;
        if (row.original.paymentType === "animal" && row.original.animalType) {
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
          <p className="text-sm text-muted-foreground">Catatan kewajiban adat antar rumpun keluarga.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="lg" className="gap-2"><Plus className="size-4" /> Catat Kewajiban</Button>
      </div>

      <DataTable
        data={rows} columns={columns} searchableColumnIds={["event"]}
        searchPlaceholder="Cari kewajiban..."
        filters={[{ id: "date", label: "Tanggal", type: "daterange" as const }]}
        loading={isLoading}
        onEdit={(r) => setEditItem(r)} onDelete={(r) => setDeleteItem(r)}
        emptyMessage="Belum ada data kewajiban."
      />

      <ObligationFormDialog
        open={showCreate} onOpenChange={setShowCreate} title="Catat Kewajiban Baru"
        clans={clans} animalTypes={animalTypes}
        onSubmit={async (v) => { await createObligation.mutateAsync(buildPayload(v)); toast.success("Kewajiban berhasil dicatat"); setShowCreate(false); }}
        loading={createObligation.isPending}
      />

      <ObligationFormDialog
        open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)} title="Edit Kewajiban"
        clans={clans} animalTypes={animalTypes}
        defaultValues={editItem ? {
          giver: editItem.giver, receiver: editItem.receiver, paymentType: editItem.paymentType,
          animalType: editItem.animalType || "", moneyAmount: String(editItem.moneyAmount || ""),
          quantity: String(editItem.quantity), event: editItem.event, date: editItem.date?.slice(0, 10) || "",
        } : undefined}
        onSubmit={async (v) => {
          if (!editItem) return;
          await updateObligation.mutateAsync({ id: editItem.id, data: buildPayload(v) });
          toast.success("Berhasil diperbarui");
          setEditItem(null);
        }}
        loading={updateObligation.isPending}
      />

      <Dialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Kewajiban</DialogTitle>
            <DialogDescription>Hapus kewajiban <strong>{deleteItem?.event}</strong>?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Batal</Button>
            <Button variant="destructive" disabled={deleteObligation.isPending} onClick={async () => {
              if (!deleteItem) return;
              await deleteObligation.mutateAsync(deleteItem.id);
              toast.success("Berhasil dihapus");
              setDeleteItem(null);
            }}>{deleteObligation.isPending ? "Menghapus..." : "Hapus"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ObligationFormDialog({ open, onOpenChange, title, clans, animalTypes, defaultValues, onSubmit, loading }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string;
  clans: Clan[]; animalTypes: AnimalType[];
  defaultValues?: FormValues; onSubmit: (v: FormValues) => Promise<void>; loading: boolean;
}) {
  const defaults: FormValues = defaultValues || {
    giver: "", receiver: "", paymentType: "money", animalType: "", moneyAmount: "", quantity: "1", event: "", date: "",
  };
  const { control, handleSubmit, watch } = useForm<FormValues>({ defaultValues: defaults, values: defaults });
  const paymentType = watch("paymentType");

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
            <Controller control={control} name="event" rules={{ required: "Wajib" }} render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Nama Acara</FieldLabel>
                <Input id={field.name} placeholder="Rambu Solo'..." aria-invalid={fieldState.invalid} {...field} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )} />

            <div className="grid grid-cols-2 gap-4">
              {(["giver", "receiver"] as const).map((key) => (
                <Controller key={key} control={control} name={key} rules={{ required: "Wajib" }} render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>{key === "giver" ? "Pemberi" : "Penerima"}</FieldLabel>
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
              <Controller control={control} name="paymentType" render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Jenis Aset</FieldLabel>
                  <NativeSelect {...field} id={field.name}>
                    <NativeSelectOption value="money">Uang</NativeSelectOption>
                    <NativeSelectOption value="animal">Hewan</NativeSelectOption>
                  </NativeSelect>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />
              <Controller control={control} name="quantity" rules={{ required: "Wajib" }} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Kuantitas</FieldLabel>
                  <Input id={field.name} type="number" min="1" aria-invalid={fieldState.invalid} {...field} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />
            </div>

            {paymentType === "money" && (
              <Controller control={control} name="moneyAmount" rules={{ required: "Wajib" }} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Jumlah Uang (Rp)</FieldLabel>
                  <Input id={field.name} type="number" placeholder="10000000" aria-invalid={fieldState.invalid} {...field} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />
            )}

            {paymentType === "animal" && (
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
              <Button type="submit" disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</Button>
            </DialogFooter>
          </form>
      </DialogContent>
    </Dialog>
  );
}


