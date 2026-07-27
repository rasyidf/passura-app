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
import type { ParticipantFormValues } from "./participants.constants";

interface ParticipantFormDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  clanOptions: { value: string; label: string; description?: string }[];
  defaultValues?: ParticipantFormValues;
  onSubmit: (v: ParticipantFormValues) => Promise<void>;
  loading: boolean;
}

export function ParticipantFormDialog({
  open,
  onOpenChange,
  title,
  clanOptions,
  defaultValues,
  onSubmit,
  loading,
}: ParticipantFormDialogProps) {
  const defaults: ParticipantFormValues = defaultValues ?? {
    name: "", clan: "", role: "member", notes: "",
  };

  const { control, handleSubmit } = useForm<ParticipantFormValues>({
    defaultValues: defaults,
    values: defaults,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            control={control}
            name="name"
            rules={{ required: "Wajib" }}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Nama</FieldLabel>
                <Input id={field.name} placeholder="Nama peserta" aria-invalid={fieldState.invalid} {...field} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            control={control}
            name="clan"
            rules={{ required: "Wajib" }}
            render={({ field, fieldState }) => (
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
            )}
          />

          <Controller
            control={control}
            name="role"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Peran</FieldLabel>
                <NativeSelect {...field} id={field.name}>
                  <NativeSelectOption value="head">Kepala</NativeSelectOption>
                  <NativeSelectOption value="member">Anggota</NativeSelectOption>
                  <NativeSelectOption value="ancestor">Leluhur</NativeSelectOption>
                </NativeSelect>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            control={control}
            name="notes"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Catatan</FieldLabel>
                <Textarea id={field.name} placeholder="Opsional..." aria-invalid={fieldState.invalid} {...field} />
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
