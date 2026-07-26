import { useState, useMemo } from "react";
import { useLocalQuery } from "@/hooks/useLocalQuery";
import { useCreateDoc, useUpdateDoc, useDeleteDoc } from "@/hooks/useLocalMutation";
import { useForm, Controller } from "react-hook-form";
import DataTable from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { MultiRelationshipInput } from "@/components/ui/relationship-input";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Users } from "lucide-react";
import type { Clan, Group } from "@/db/types";

type FormValues = {
  name: string;
  eventName: string;
  description: string;
  members: string[];
};

export default function GroupsScreen() {
  const { data, isLoading } = useLocalQuery<Group>("groups");
  const { data: clansData } = useLocalQuery<Clan>("clans");
  const createGroup = useCreateDoc("groups");
  const updateGroup = useUpdateDoc("groups");
  const deleteGroup = useDeleteDoc("groups");

  const [editItem, setEditItem] = useState<Group | null>(null);
  const [deleteItem, setDeleteItem] = useState<Group | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [viewClanGroup, setViewClanGroup] = useState<Group | null>(null);

  const rows = data?.docs ?? [];
  const clans = clansData?.docs ?? [];

  // Build a lookup map for fast clan name resolution
  const clanById = useMemo(() => {
    const map: Record<string, Clan> = {};
    for (const c of clans) map[c.id] = c;
    return map;
  }, [clans]);

  const clanOptions = useMemo(
    () =>
      clans.map((c) => ({
        value: c.id,
        label: c.name,
        description: c.region,
      })),
    [clans]
  );

  const columns: ColumnDef<Group>[] = useMemo(
    () => [
      { accessorKey: "name", header: "Nama Grup" },
      {
        accessorKey: "eventName",
        header: "Acara",
        cell: ({ row }) => row.original.eventName || "—",
      },
      {
        accessorKey: "description",
        header: "Deskripsi",
        cell: ({ row }) => (
          <span className="line-clamp-2 text-sm text-muted-foreground">
            {row.original.description || "—"}
          </span>
        ),
      },
      {
        accessorKey: "members",
        header: "Clan",
        cell: ({ row }) => {
          const count = row.original.members?.length ?? 0;
          if (count === 0) {
            return (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="size-3.5" /> 0 clan
              </span>
            );
          }
          return (
            <button
              type="button"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              onClick={() => setViewClanGroup(row.original)}
              aria-label={`Lihat ${count} clan di grup ${row.original.name}`}
            >
              <Users className="size-3.5" />
              {count} clan
            </button>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Grup</h1>
          <p className="text-sm text-muted-foreground">
            Kelompok untuk buku besar acara tertentu.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="lg" className="gap-2">
          <Plus className="size-4" /> Buat Grup
        </Button>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        searchableColumnIds={["name", "eventName"]}
        searchPlaceholder="Cari grup..."
        loading={isLoading}
        onEdit={(row) => setEditItem(row)}
        onDelete={(row) => setDeleteItem(row)}
        emptyMessage="Belum ada grup. Klik 'Buat Grup' untuk memulai."
      />

      {/* Create */}
      <GroupFormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        title="Buat Grup Baru"
        clanOptions={clanOptions}
        onSubmit={async (values) => {
          await createGroup.mutateAsync(values);
          toast.success("Grup berhasil dibuat");
          setShowCreate(false);
        }}
        loading={createGroup.isPending}
      />

      {/* Edit */}
      <GroupFormDialog
        open={!!editItem}
        onOpenChange={(o) => !o && setEditItem(null)}
        title="Edit Grup"
        clanOptions={clanOptions}
        defaultValues={
          editItem
            ? {
                name: editItem.name,
                eventName: editItem.eventName ?? "",
                description: editItem.description ?? "",
                members: editItem.members ?? [],
              }
            : undefined
        }
        onSubmit={async (values) => {
          if (!editItem) return;
          await updateGroup.mutateAsync({ id: editItem.id, data: values });
          toast.success("Grup berhasil diperbarui");
          setEditItem(null);
        }}
        loading={updateGroup.isPending}
      />

      {/* Delete */}
      <Dialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Grup</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus grup{" "}
              <strong>{deleteItem?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={deleteGroup.isPending}
              onClick={async () => {
                if (!deleteItem) return;
                await deleteGroup.mutateAsync(deleteItem.id);
                toast.success("Grup berhasil dihapus");
                setDeleteItem(null);
              }}
            >
              {deleteGroup.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clan detail viewer */}
      <Dialog
        open={!!viewClanGroup}
        onOpenChange={(o) => !o && setViewClanGroup(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Clan dalam "{viewClanGroup?.name}"</DialogTitle>
            <DialogDescription>
              Daftar clan yang tergabung dalam grup ini.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2 max-h-72 overflow-y-auto">
            {(viewClanGroup?.members ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Belum ada clan.
              </p>
            ) : (
              viewClanGroup?.members.map((clanId) => {
                const clan = clanById[clanId];
                return (
                  <div
                    key={clanId}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2"
                  >
                    <Users className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {clan?.name ?? clanId}
                      </p>
                      {clan?.region && (
                        <p className="text-xs text-muted-foreground truncate">
                          {clan.region}
                        </p>
                      )}
                    </div>
                    {!clan && (
                      <Badge variant="destructive" className="ml-auto text-xs">
                        Tidak ditemukan
                      </Badge>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewClanGroup(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Form Dialog ──────────────────────────────────────────────────────────────

function GroupFormDialog({
  open,
  onOpenChange,
  title,
  clanOptions,
  defaultValues,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  clanOptions: { value: string; label: string; description?: string }[];
  defaultValues?: FormValues;
  onSubmit: (v: FormValues) => Promise<void>;
  loading: boolean;
}) {
  const defaults: FormValues = defaultValues ?? {
    name: "",
    eventName: "",
    description: "",
    members: [],
  };

  const { control, handleSubmit } = useForm<FormValues>({
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
          {/* Nama Grup */}
          <Controller
            control={control}
            name="name"
            rules={{ required: "Nama wajib diisi" }}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Nama Grup</FieldLabel>
                <Input
                  id={field.name}
                  placeholder="Rambu Solo' Kampung X"
                  aria-invalid={fieldState.invalid}
                  {...field}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* Nama Acara */}
          <Controller
            control={control}
            name="eventName"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Nama Acara</FieldLabel>
                <Input
                  id={field.name}
                  placeholder="Rambu Solo'"
                  aria-invalid={fieldState.invalid}
                  {...field}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* Deskripsi */}
          <Controller
            control={control}
            name="description"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Deskripsi</FieldLabel>
                <Textarea
                  id={field.name}
                  placeholder="Keterangan grup..."
                  aria-invalid={fieldState.invalid}
                  {...field}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* Clan Members */}
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
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
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
