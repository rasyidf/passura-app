import { useState, useMemo } from "react";
import { useLocalQuery } from "@/hooks/useLocalQuery";
import { useCreateDoc, useUpdateDoc, useDeleteDoc } from "@/hooks/useLocalMutation";
import DataTable from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Plus, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Participant, Clan } from "@/db/types";
import { ParticipantFormDialog } from "./ParticipantFormDialog";
import { ROLE_BADGE, type ParticipantFormValues } from "./participants.constants";

export default function ParticipantsScreen() {
  const { data, isLoading } = useLocalQuery<Participant>("participants");
  const { data: clansData } = useLocalQuery<Clan>("clans");
  const createParticipant = useCreateDoc("participants");
  const updateParticipant = useUpdateDoc("participants");
  const deleteParticipant = useDeleteDoc("participants");

  const [editItem, setEditItem] = useState<Participant | null>(null);
  const [deleteItem, setDeleteItem] = useState<Participant | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const clans = clansData?.docs ?? [];
  const rows = data?.docs ?? [];

  const clanMap = useMemo(
    () => Object.fromEntries(clans.map((c) => [c.id, c.name])),
    [clans],
  );

  const clanOptions = useMemo(
    () => clans.map((c) => ({ value: c.id, label: c.name, description: c.region })),
    [clans],
  );

  const clanFilterOptions = useMemo(
    () => clans.map((c) => ({ value: c.id, label: c.name })),
    [clans],
  );

  const columns: ColumnDef<Participant>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Nama",
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: "clan",
        header: "Rumpun",
        filterFn: "multiSelect" as never,
        cell: ({ row }) => {
          const name = clanMap[row.original.clan] ?? row.original.clan;
          return (
            <Link
              to="/dashboard/clans"
              className="inline-flex items-center gap-1 text-primary hover:underline underline-offset-2 text-sm"
              onClick={(e) => e.stopPropagation()}
            >
              {name}
              <ExternalLink className="size-3 opacity-60" />
            </Link>
          );
        },
      },
      {
        accessorKey: "role",
        header: "Peran",
        cell: ({ row }) => {
          const b = ROLE_BADGE[row.original.role] ?? {
            label: row.original.role,
            className: "bg-gray-100 text-gray-600 border-gray-200",
          };
          return <Badge variant="outline" className={b.className}>{b.label}</Badge>;
        },
      },
      {
        accessorKey: "notes",
        header: "Catatan",
        cell: ({ row }) => row.original.notes || "-",
      },
    ],
    [clanMap],
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold">Silsilah / Peserta</h1>
          <p className="text-sm text-muted-foreground">
            Catatan peserta dan garis keturunan per rumpun keluarga.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="lg" className="gap-2">
          <Plus className="size-4" /> Tambah Peserta
        </Button>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        searchableColumnIds={["name", "role"]}
        searchPlaceholder="Cari peserta..."
        filters={[{
          id: "clan",
          label: "Rumpun",
          type: "multiselect",
          options: clanFilterOptions,
          placeholder: "Semua Rumpun",
        }]}
        loading={isLoading}
        onEdit={(row) => setEditItem(row)}
        onDelete={(row) => setDeleteItem(row)}
        emptyMessage="Belum ada peserta terdaftar."
      />

      {/* Create dialog */}
      <ParticipantFormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        title="Tambah Peserta"
        clanOptions={clanOptions}
        onSubmit={async (v: ParticipantFormValues) => {
          await createParticipant.mutateAsync(v);
          toast.success("Peserta berhasil ditambahkan");
          setShowCreate(false);
        }}
        loading={createParticipant.isPending}
      />

      {/* Edit dialog */}
      <ParticipantFormDialog
        open={!!editItem}
        onOpenChange={(o) => !o && setEditItem(null)}
        title="Edit Peserta"
        clanOptions={clanOptions}
        defaultValues={
          editItem
            ? {
                name: editItem.name,
                clan: editItem.clan,
                role: editItem.role,
                notes: editItem.notes || "",
              }
            : undefined
        }
        onSubmit={async (v: ParticipantFormValues) => {
          if (!editItem) return;
          await updateParticipant.mutateAsync({ id: editItem.id, data: v });
          toast.success("Berhasil diperbarui");
          setEditItem(null);
        }}
        loading={updateParticipant.isPending}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Peserta</DialogTitle>
            <DialogDescription>
              Hapus <strong>{deleteItem?.name}</strong> dari silsilah?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Batal</Button>
            <Button
              variant="destructive"
              disabled={deleteParticipant.isPending}
              onClick={async () => {
                if (!deleteItem) return;
                await deleteParticipant.mutateAsync(deleteItem.id);
                toast.success("Berhasil dihapus");
                setDeleteItem(null);
              }}
            >
              {deleteParticipant.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
