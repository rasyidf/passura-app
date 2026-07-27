import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { MultiRelationshipInput } from "@/components/ui/relationship-input";

export interface GroupFormValues {
  name: string;
  eventName: string;
  description: string;
  members: string[];
}

interface GroupFormDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  clanOptions: { value: string; label: string; description?: string }[];
  defaultValues?: GroupFormValues;
  onSubmit: (v: GroupFormValues) => Promise<void>;
  loading: boolean;
}

export function GroupFormDialog({
  open,
  onOpenChange,
  title,
  clanOptions,
  defaultValues,
  onSubmit,
  loading,
}: GroupFormDialogProps) {
  const defaults: GroupFormValues = defaultValues ?? {
    name: "", eventName: "", description: "", members: [],
  };

  const { control, handleSubmit } = useForm<GroupFormValues>({
    defaultValues: defaults,
    values: defaults,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
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
                <FieldLabel htmlFor={field.name}>Nama Grup</FieldLabel>
                <Input id={field.name} placeholder="Rambu Solo' Kampung X" aria-invalid={fieldState.invalid} {...field} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            control={control}
            name="eventName"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Nama Acara</FieldLabel>
                <Input id={field.name} placeholder="Rambu Solo'" aria-invalid={fieldState.invalid} {...field} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            control={control}
            name="description"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Deskripsi</FieldLabel>
                <Textarea id={field.name} placeholder="Keterangan grup..." aria-invalid={fieldState.invalid} {...field} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            control={control}
            name="members"
            render={({ field }) => (
              <Field>
                <FieldLabel>Clan Anggota</FieldLabel>
                <MultiRelationshipInput
                  options={clanOptions}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Tambah clan..."
                  searchPlaceholder="Cari clan..."
                  emptyMessage="Clan tidak ditemukan."
                />
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
