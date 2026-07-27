import { useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { RelationshipInput } from "@/components/ui/relationship-input";
import { DatePicker } from "@/components/ui/date-picker";
import type { Clan, AnimalType } from "@/db/types";
import type { ObligationFormValues } from "./obligations.constants";

interface ObligationFormDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  clans: Clan[];
  animalTypes: AnimalType[];
  defaultValues?: ObligationFormValues;
  onSubmit: (v: ObligationFormValues) => Promise<void>;
  loading: boolean;
}

export function ObligationFormDialog({
  open,
  onOpenChange,
  title,
  clans,
  animalTypes,
  defaultValues,
  onSubmit,
  loading,
}: ObligationFormDialogProps) {
  const defaults: ObligationFormValues = defaultValues ?? {
    giver: "", receiver: "", paymentType: "money", animalType: "",
    moneyAmount: "", quantity: "1", event: "", date: "",
  };

  const { control, handleSubmit, watch } = useForm<ObligationFormValues>({
    defaultValues: defaults,
    values: defaults,
  });
  const paymentType = watch("paymentType");

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
          {/* Event name */}
          <Controller
            control={control}
            name="event"
            rules={{ required: "Wajib" }}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Nama Acara</FieldLabel>
                <Input id={field.name} placeholder="Rambu Solo'..." aria-invalid={fieldState.invalid} {...field} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* Giver / Receiver */}
          <div className="grid grid-cols-2 gap-4">
            {(["giver", "receiver"] as const).map((key) => (
              <Controller
                key={key}
                control={control}
                name={key}
                rules={{ required: "Wajib" }}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      {key === "giver" ? "Pemberi" : "Penerima"}
                    </FieldLabel>
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

          {/* Payment type / Quantity */}
          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={control}
              name="paymentType"
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
            <Controller
              control={control}
              name="quantity"
              rules={{ required: "Wajib" }}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Kuantitas</FieldLabel>
                  <Input id={field.name} type="number" min="1" aria-invalid={fieldState.invalid} {...field} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>

          {/* Money amount (conditional) */}
          {paymentType === "money" && (
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

          {/* Animal type (conditional) */}
          {paymentType === "animal" && (
            <Controller
              control={control}
              name="animalType"
              rules={{ required: "Wajib" }}
              render={({ field, fieldState }) => (
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
              )}
            />
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
