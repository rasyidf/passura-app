import { useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { RelationshipInput } from "@/components/ui/relationship-input";
import { DatePicker } from "@/components/ui/date-picker";
import type { Clan, AnimalType } from "@/db/types";
import { OBLIGATION_TYPES, type HandoverFormValues } from "./handovers.constants";

interface HandoverFormDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  clans: Clan[];
  animalTypes: AnimalType[];
  defaultValues?: HandoverFormValues;
  onSubmit: (v: HandoverFormValues) => Promise<void>;
  loading: boolean;
}

export function HandoverFormDialog({
  open,
  onOpenChange,
  title,
  clans,
  animalTypes,
  defaultValues,
  onSubmit,
  loading,
}: HandoverFormDialogProps) {
  const defaults: HandoverFormValues = defaultValues ?? {
    fromClan: "", toClan: "", assetType: "money", obligationType: "ritual",
    moneyAmount: "", animalType: "", quantity: "", date: "", notes: "",
  };

  const { control, handleSubmit, watch } = useForm<HandoverFormValues>({
    defaultValues: defaults,
    values: defaults,
  });
  const assetType = watch("assetType");

  const clanOptions = useMemo(
    () => clans.map((c) => ({ value: c.id, label: c.name, description: c.region })),
    [clans],
  );
  const animalOptions = useMemo(
    () => animalTypes.map((a) => ({ value: a.id, label: a.name, description: `${a.breed} — ${a.quality}` })),
    [animalTypes],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* From / To clan */}
          <div className="grid grid-cols-2 gap-4">
            {(["fromClan", "toClan"] as const).map((key) => (
              <Controller
                key={key}
                control={control}
                name={key}
                rules={{ required: "Wajib" }}
                render={({ field, fieldState }) => (
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
                )}
              />
            ))}
          </div>

          {/* Obligation type / Asset type */}
          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={control}
              name="obligationType"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Jenis Kewajiban</FieldLabel>
                  <NativeSelect {...field} id={field.name}>
                    {OBLIGATION_TYPES.map((o) => (
                      <NativeSelectOption key={o.value} value={o.value}>{o.label}</NativeSelectOption>
                    ))}
                  </NativeSelect>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={control}
              name="assetType"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Jenis Aset</FieldLabel>
                  <NativeSelect {...field} id={field.name}>
                    <NativeSelectOption value="money">Uang</NativeSelectOption>
                    <NativeSelectOption value="animal">Hewan</NativeSelectOption>
                  </NativeSelect>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>

          {/* Asset-conditional fields */}
          {assetType === "money" && (
            <Controller
              control={control}
              name="moneyAmount"
              rules={{ required: "Wajib" }}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Jumlah Uang (Rp)</FieldLabel>
                  <Input id={field.name} type="number" placeholder="10000000" aria-invalid={fieldState.invalid} {...field} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          )}

          {assetType === "animal" && (
            <div className="grid grid-cols-2 gap-4">
              <Controller
                control={control}
                name="animalType"
                rules={{ required: "Wajib" }}
                render={({ field, fieldState }) => (
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
                )}
              />
              <Controller
                control={control}
                name="quantity"
                rules={{ required: "Wajib" }}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Kuantitas</FieldLabel>
                    <Input id={field.name} type="number" min="1" placeholder="1" aria-invalid={fieldState.invalid} {...field} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>
          )}

          {/* Date */}
          <Controller
            control={control}
            name="date"
            rules={{ required: "Wajib" }}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Tanggal</FieldLabel>
                <DatePicker value={field.value} onChange={field.onChange} aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* Notes */}
          <Controller
            control={control}
            name="notes"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Keterangan</FieldLabel>
                <Textarea id={field.name} placeholder="Catatan opsional..." aria-invalid={fieldState.invalid} {...field} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
