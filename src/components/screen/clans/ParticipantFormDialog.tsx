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
import { Plus, X } from "lucide-react";
import type { Participant } from "@/db/types";
import { RELATION_TYPE_LABELS, type ParticipantFormValues } from "./types";
export function ParticipantFormDialog({
  open, onOpenChange, title, clanId, participants, defaultValues, onSubmit, loading,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  clanId: string;
  participants: Participant[];
  defaultValues?: ParticipantFormValues;
  onSubmit: (v: ParticipantFormValues) => Promise<void>;
  loading: boolean;
}) {
  const defaults: ParticipantFormValues = defaultValues ?? {
    name: "", clan: clanId, role: "member", gender: "", passedAway: false, notes: "", relations: [],
  };

  const { control, handleSubmit, watch, setValue } = useForm<ParticipantFormValues>({
    defaultValues: defaults,
    values: defaults,
  });

  const relations = watch("relations");

  const participantOptions = useMemo(
    () => participants.map((p) => ({ value: p.id, label: p.name })),
    [participants]
  );

  function addRelation() {
    setValue("relations", [...(relations ?? []), { type: "other", participantId: "", notes: "" }]);
  }

  function removeRelation(idx: number) {
    setValue("relations", (relations ?? []).filter((_, i) => i !== idx));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <Controller
            control={control} name="name" rules={{ required: "Wajib" }}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Nama</FieldLabel>
                <Input id={field.name} placeholder="Nama anggota" aria-invalid={fieldState.invalid} {...field} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* Role + Gender */}
          <div className="grid grid-cols-2 gap-3">
            <Controller control={control} name="role" render={({ field }) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Peran</FieldLabel>
                <NativeSelect {...field} id={field.name}>
                  <NativeSelectOption value="head">Kepala</NativeSelectOption>
                  <NativeSelectOption value="member">Anggota</NativeSelectOption>
                  <NativeSelectOption value="ancestor">Leluhur</NativeSelectOption>
                </NativeSelect>
              </Field>
            )} />

            <Controller control={control} name="gender" render={({ field }) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Jenis Kelamin</FieldLabel>
                <NativeSelect {...field} id={field.name}>
                  <NativeSelectOption value="">Tidak ditentukan</NativeSelectOption>
                  <NativeSelectOption value="male">Laki-laki</NativeSelectOption>
                  <NativeSelectOption value="female">Perempuan</NativeSelectOption>
                  <NativeSelectOption value="other">Lainnya</NativeSelectOption>
                </NativeSelect>
              </Field>
            )} />
          </div>

          {/* Passed away */}
          <Controller control={control} name="passedAway" render={({ field }) => (
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                className="size-4 rounded border-input accent-primary cursor-pointer"
              />
              <span className="text-sm">Sudah meninggal dunia</span>
            </label>
          )} />

          {/* Relationships */}
          <Field>
            <div className="flex items-center justify-between mb-1.5">
              <FieldLabel className="mb-0">Hubungan Keluarga</FieldLabel>
              <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={addRelation}>
                <Plus className="size-3" /> Tambah
              </Button>
            </div>

            {(!relations || relations.length === 0) ? (
              <p className="text-xs text-muted-foreground py-2 text-center border rounded-lg">
                Belum ada hubungan. Klik "Tambah" untuk menambahkan.
              </p>
            ) : (
              <div className="space-y-2">
                {relations.map((_, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg border bg-muted/30">
                    <div className="flex-1 grid grid-cols-2 gap-2 min-w-0">
                      <Controller
                        control={control} name={`relations.${idx}.type`}
                        render={({ field }) => (
                          <Field>
                            <FieldLabel className="text-xs">Hubungan</FieldLabel>
                            <NativeSelect {...field} className="text-xs h-8">
                              {Object.entries(RELATION_TYPE_LABELS).map(([v, l]) => (
                                <NativeSelectOption key={v} value={v}>{l}</NativeSelectOption>
                              ))}
                            </NativeSelect>
                          </Field>
                        )}
                      />
                      <Controller
                        control={control} name={`relations.${idx}.participantId`}
                        render={({ field }) => (
                          <Field>
                            <FieldLabel className="text-xs">Anggota</FieldLabel>
                            <RelationshipInput
                              options={participantOptions}
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Pilih anggota..."
                              searchPlaceholder="Cari..."
                              emptyMessage="Tidak ditemukan."
                            />
                          </Field>
                        )}
                      />
                    </div>
                    <Button
                      type="button" variant="ghost" size="icon"
                      className="size-7 mt-5 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeRelation(idx)} aria-label="Hapus hubungan"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Field>

          {/* Notes */}
          <Controller control={control} name="notes" render={({ field }) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Catatan</FieldLabel>
              <Textarea id={field.name} placeholder="Opsional..." {...field} />
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
