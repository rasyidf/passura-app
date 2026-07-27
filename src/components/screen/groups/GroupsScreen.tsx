import { useState, useMemo } from "react";
import { useLocalQuery } from "@/hooks/useLocalQuery";
import { useCreateDoc, useUpdateDoc, useDeleteDoc } from "@/hooks/useLocalMutation";
import DataTable from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Plus, Users } from "lucide-react";
import type { Clan, Group } from "@/db/types";
import { GroupFormDialog, type GroupFormValues } from "./GroupFormDialog";
import { GroupClanViewerDialog } from "./GroupClanViewerDialog";

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

  const clanById = useMemo(() => {
    const map: Record<string, Clan> = {};
    for (const c of clans) map[c.id] = c;
    return map;
  }, [clans]);

  const clanOptions = useMemo(
    () => clans.map((c) => ({ value: c.id, label: c.name, description: c.region })),
    [clans],
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
    [],
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

      {/* Create dialog */}
      <GroupFormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        title="Buat Grup Baru"
        clanOptions={clanOptions}
        onSubmit={async (values: GroupFormValues) => {
          await createGroup.mutateAsync(values);
          toast.success("Grup berhasil dibuat");
          setShowCreate(false);
        }}
        loading={createGroup.isPending}
      />

      {/* Edit dialog */}
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
        onSubmit={async (values: GroupFormValues) => {
          if (!editItem) return;
          await updateGroup.mutateAsync({ id: editItem.id, data: values });
          toast.success("Grup berhasil diperbarui");
          setEditItem(null);
        }}
        loading={updateGroup.isPending}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Grup</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus grup <strong>{deleteItem?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Batal</Button>
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

      {/* Clan viewer dialog */}
      <GroupClanViewerDialog
        group={viewClanGroup}
        clanById={clanById}
        onClose={() => setViewClanGroup(null)}
      />
    </div>
  );
}
