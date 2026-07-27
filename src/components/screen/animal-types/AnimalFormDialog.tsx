import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { AnimalTypeFormValues } from "./animal-types.constants";

interface AnimalFormDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  defaultValues?: AnimalTypeFormValues;
  onSubmit: (v: AnimalTypeFormValues) => Promise<void>;
  loading: boolean;
}

export function AnimalFormDialog({
  open,
  onOpenChange,
  title,
  defaultValues,
  onSubmit,
  loading,
}: AnimalFormDialogProps) {
  const defaults: AnimalTypeFormValues = defaultValues ?? {
    name: "", category: "buffalo", breed: "", geneticLine: "", quality: "medium", price: "",
  };

  const { control, handleSubmit } = useForm<AnimalTypeFormValues>({
    defaultValues: defaults,
    values: defaults,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            control={control}
            name="name"
            rules={{ required: "Wajib" }}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel>Nama</FieldLabel>
                <Input placeholder="Tedong Bonga" {...field} />
                <FieldError>{fieldState.error?.message}</FieldError>
              </Field>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Kategori</FieldLabel>
                  <NativeSelect {...field}>
                    <NativeSelectOption value="buffalo">Kerbau</NativeSelectOption>
                    <NativeSelectOption value="pig">Babi</NativeSelectOption>
                  </NativeSelect>
                </Field>
              )}
            />
            <Controller
              control={control}
              name="quality"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Kualitas</FieldLabel>
                  <NativeSelect {...field}>
                    <NativeSelectOption value="low">Rendah</NativeSelectOption>
                    <NativeSelectOption value="medium">Sedang</NativeSelectOption>
                    <NativeSelectOption value="high">Tinggi</NativeSelectOption>
                    <NativeSelectOption value="unique">Unik/Langka</NativeSelectOption>
                  </NativeSelect>
                </Field>
              )}
            />
          </div>

          <Controller
            control={control}
            name="breed"
            rules={{ required: "Wajib" }}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel>Ras / Breed</FieldLabel>
                <Input placeholder="Bonga, Saleko..." {...field} />
                <FieldError>{fieldState.error?.message}</FieldError>
              </Field>
            )}
          />

          <Controller
            control={control}
            name="geneticLine"
            render={({ field }) => (
              <Field>
                <FieldLabel>Garis Keturunan</FieldLabel>
                <Input placeholder="Noble, common..." {...field} />
              </Field>
            )}
          />

          <Controller
            control={control}
            name="price"
            rules={{ required: "Wajib" }}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel>Harga (Rp)</FieldLabel>
                <Input type="number" placeholder="80000000" {...field} />
                <FieldError>{fieldState.error?.message}</FieldError>
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
