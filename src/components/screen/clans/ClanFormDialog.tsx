import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import type { ClanFormValues } from "./types";

interface ClanFormDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  defaultValues?: ClanFormValues;
  onSubmit: (v: ClanFormValues) => Promise<void>;
  loading: boolean;
}

export function ClanFormDialog({
  open,
  onOpenChange,
  title,
  defaultValues,
  onSubmit,
  loading,
}: ClanFormDialogProps) {
  const defaults = defaultValues ?? { name: "", region: "" };
  const { control, handleSubmit } = useForm<ClanFormValues>({
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
            rules={{ required: "Nama wajib diisi" }}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Nama Rumpun</FieldLabel>
                <Input
                  id={field.name}
                  placeholder="Tongkonan Rante"
                  aria-invalid={fieldState.invalid}
                  {...field}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            control={control}
            name="region"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Wilayah</FieldLabel>
                <Input
                  id={field.name}
                  placeholder="Rantepao, Makale, dll."
                  aria-invalid={fieldState.invalid}
                  {...field}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
