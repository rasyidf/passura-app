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
import { Plus } from "lucide-react";
import type { Handover, Clan, AnimalType } from "@/db/types";
import { MoneyCell } from "@/components/ui/money-cell";
import { ClanLink, AnimalLink } from "@/components/shared/screen-helpers";
import { HandoverFormDialog } from "./HandoverFormDialog";
import {
  OBLIGATION_TYPES, OBLIGATION_BADGE, ASSET_BADGE,
  buildHandoverPayload, type HandoverFormValues,
} from "./handovers.constants";

export default function HandoversScreen() {
  const { data, isLoading } = useLocalQuery<Handover>("handovers");
  const { data: clansData } = useLocalQuery<Clan>("clans");
  const { data: animalsData } = useLocalQuery<AnimalType>("animal-types");
  const createHandover = useCreateDoc("handovers");
  const updateHandover = useUpdateDoc("handovers");
  const deleteHandover = useDeleteDoc("handovers");

  const [editItem, setEditItem] = useState<Handover | null>(null);
  const [deleteItem, setDeleteItem] = useState<Handover | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const clans = clansData?.docs ?? [];
  const animalTypes = animalsData?.docs ?? [];
  const rows = data?.docs ?? [];

  const clanMap = useMemo(
    () => Object.fromEntries(clans.map((c) => [c.id, c.name])),
    [clans],
  );
  const animalMap = useMemo(
    () => Object.fromEntries(animalTypes.map((a) => [a.id, a.name])),
    [animalTypes],
  );

  const columns: ColumnDef<Handover>[] = useMemo(
    () => [
      {
        accessorKey: "date",
        header: "Tanggal",
        filterFn: "dateRange" as never,
        cell: ({ row }) => row.original.date?.slice(0, 10) || "-",
      },
      {
        accessorKey: "fromClan",
        header: "Dari",
        cell: ({ row }) => (
          <ClanLink
            id={row.original.fromClan}
            name={clanMap[row.original.fromClan] ?? row.original.fromClan}
          />
        ),
      },
      {
        accessorKey: "toClan",
        header: "Ke",
        cell: ({ row }) => (
          <ClanLink
            id={row.original.toClan}
            name={clanMap[row.original.toClan] ?? row.original.toClan}
          />
        ),
      },
      {
        accessorKey: "obligationType",
        header: "Jenis",
        cell: ({ row }) => {
          const b = OBLIGATION_BADGE[row.original.obligationType] ?? {
            label: row.original.obligationType,
            className: "bg-gray-100 text-gray-600 border-gray-200",
          };
          return <Badge variant="outline" className={b.className}>{b.label}</Badge>;
        },
      },
      {
        accessorKey: "assetType",
        header: "Aset",
        cell: ({ row }) => {
          const b = ASSET_BADGE[row.original.assetType] ?? {
            label: row.original.assetType,
            className: "bg-gray-100 text-gray-600 border-gray-200",
          };
          const badge = <Badge variant="outline" className={b.className}>{b.label}</Badge>;
          if (row.original.assetType === "animal" && row.original.animalType) {
            return (
              <div className="flex items-center gap-1.5">
                {badge}
                <AnimalLink
                  id={row.original.animalType}
                  name={animalMap[row.original.animalType] ?? row.original.animalType}
                />
              </div>
            );
          }
          return badge;
        },
      },
      {
        accessorKey: "calculatedValue",
        header: "Nilai",
        cell: ({ row }) => <MoneyCell value={row.original.calculatedValue} />,
      },
    ],
    [clanMap, animalMap],
  );

  const filters = useMemo(
    () => [
      { id: "date",           label: "Tanggal", type: "daterange" as const },
      { id: "obligationType", label: "Jenis",   type: "select" as const, options: OBLIGATION_TYPES },
    ],
    [],
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Penyerahan</h1>
          <p className="text-sm text-muted-foreground">
            Catatan penyerahan donasi ke rumpun keluarga lain.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="lg" className="gap-2">
          <Plus className="size-4" /> Catat Penyerahan
        </Button>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        searchableColumnIds={["obligationType"]}
        searchPlaceholder="Cari penyerahan..."
        filters={filters}
        loading={isLoading}
        onEdit={(r) => setEditItem(r)}
        onDelete={(r) => setDeleteItem(r)}
        emptyMessage="Belum ada data penyerahan."
      />

      {/* Create dialog */}
      <HandoverFormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        title="Catat Penyerahan Baru"
        clans={clans}
        animalTypes={animalTypes}
        onSubmit={async (v: HandoverFormValues) => {
          await createHandover.mutateAsync(buildHandoverPayload(v));
          toast.success("Penyerahan berhasil dicatat");
          setShowCreate(false);
        }}
        loading={createHandover.isPending}
      />

      {/* Edit dialog */}
      <HandoverFormDialog
        open={!!editItem}
        onOpenChange={(o) => !o && setEditItem(null)}
        title="Edit Penyerahan"
        clans={clans}
        animalTypes={animalTypes}
        defaultValues={
          editItem
            ? {
                fromClan: editItem.fromClan,
                toClan: editItem.toClan,
                assetType: editItem.assetType,
                obligationType: editItem.obligationType,
                moneyAmount: String(editItem.moneyAmount || ""),
                animalType: editItem.animalType || "",
                quantity: String(editItem.quantity || ""),
                date: editItem.date?.slice(0, 10) || "",
                notes: editItem.notes || "",
              }
            : undefined
        }
        onSubmit={async (v: HandoverFormValues) => {
          if (!editItem) return;
          await updateHandover.mutateAsync({ id: editItem.id, data: buildHandoverPayload(v) });
          toast.success("Berhasil diperbarui");
          setEditItem(null);
        }}
        loading={updateHandover.isPending}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Penyerahan</DialogTitle>
            <DialogDescription>Hapus catatan penyerahan ini?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Batal</Button>
            <Button
              variant="destructive"
              disabled={deleteHandover.isPending}
              onClick={async () => {
                if (!deleteItem) return;
                await deleteHandover.mutateAsync(deleteItem.id);
                toast.success("Berhasil dihapus");
                setDeleteItem(null);
              }}
            >
              {deleteHandover.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
