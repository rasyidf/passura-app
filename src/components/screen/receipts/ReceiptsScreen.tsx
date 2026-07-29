import { useState, useMemo } from "react";
import { useLocalQuery } from "@/hooks/useLocalQuery";
import { useClanMap, useAnimalTypeMap } from "@/hooks/useLookupMaps";
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
import type { Receipt, Clan, AnimalType } from "@/db/types";
import { MoneyCell } from "@/components/ui/money-cell";
import { ClanLink, AnimalLink } from "@/components/shared/screen-helpers";
import { ReceiptFormDialog } from "./ReceiptFormDialog";
import {
  OBLIGATION_TYPES, OBLIGATION_BADGE, ASSET_BADGE,
  SETTLEMENT_BADGE, SETTLEMENT_STATUS_FILTER_OPTIONS,
  buildReceiptPayload, type ReceiptFormValues,
} from "./receipts.constants";

export default function ReceiptsScreen() {
  const { data, isLoading } = useLocalQuery<Receipt>("receipts");
  const { data: clansData } = useLocalQuery<Clan>("clans");
  const { data: animalsData } = useLocalQuery<AnimalType>("animal-types");
  const createReceipt = useCreateDoc("receipts");
  const updateReceipt = useUpdateDoc("receipts");
  const deleteReceipt = useDeleteDoc("receipts");

  const [editItem, setEditItem] = useState<Receipt | null>(null);
  const [deleteItem, setDeleteItem] = useState<Receipt | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const clans = clansData?.docs ?? [];
  const animalTypes = animalsData?.docs ?? [];
  const rows = data?.docs ?? [];

  const clanMap = useClanMap();
  const animalMap = useAnimalTypeMap();

  const columns: ColumnDef<Receipt>[] = useMemo(
    () => [
      {
        accessorKey: "dateReceived",
        header: "Tanggal",
        filterFn: "dateRange" as never,
        cell: ({ row }) => row.original.dateReceived?.slice(0, 10) || "-",
      },
      {
        accessorKey: "receiver",
        header: "Penerima",
        cell: ({ row }) => (
          <ClanLink
            id={row.original.receiver}
            name={clanMap[row.original.receiver] ?? row.original.receiver}
          />
        ),
      },
      {
        accessorKey: "giver",
        header: "Pemberi",
        cell: ({ row }) => (
          <ClanLink
            id={row.original.giver}
            name={clanMap[row.original.giver] ?? row.original.giver}
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
      {
        accessorKey: "settlementStatus",
        header: "Status",
        cell: ({ row }) => {
          const b = SETTLEMENT_BADGE[row.original.settlementStatus] ?? {
            label: row.original.settlementStatus,
            className: "bg-gray-100 text-gray-600 border-gray-200",
          };
          return <Badge variant="outline" className={b.className}>{b.label}</Badge>;
        },
      },
    ],
    [clanMap, animalMap],
  );

  const filters = useMemo(
    () => [
      { id: "dateReceived",    label: "Tanggal", type: "daterange" as const },
      { id: "obligationType",  label: "Jenis",   type: "select" as const,    options: OBLIGATION_TYPES },
      { id: "settlementStatus", label: "Status", type: "segmented" as const, options: SETTLEMENT_STATUS_FILTER_OPTIONS },
    ],
    [],
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Penerimaan</h1>
          <p className="text-sm text-muted-foreground">
            Catatan penerimaan donasi dari rumpun keluarga lain.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="lg" className="gap-2">
          <Plus className="size-4" /> Catat Penerimaan
        </Button>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        searchableColumnIds={["obligationType"]}
        searchPlaceholder="Cari penerimaan..."
        filters={filters}
        loading={isLoading}
        onEdit={(r) => setEditItem(r)}
        onDelete={(r) => setDeleteItem(r)}
        emptyMessage="Belum ada data penerimaan."
      />

      {/* Create dialog */}
      <ReceiptFormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        title="Catat Penerimaan Baru"
        clans={clans}
        animalTypes={animalTypes}
        onSubmit={async (v: ReceiptFormValues) => {
          await createReceipt.mutateAsync(buildReceiptPayload(v));
          toast.success("Penerimaan berhasil dicatat");
          setShowCreate(false);
        }}
        loading={createReceipt.isPending}
      />

      {/* Edit dialog */}
      <ReceiptFormDialog
        open={!!editItem}
        onOpenChange={(o) => !o && setEditItem(null)}
        title="Edit Penerimaan"
        clans={clans}
        animalTypes={animalTypes}
        defaultValues={
          editItem
            ? {
                receiver: editItem.receiver,
                giver: editItem.giver,
                assetType: editItem.assetType,
                obligationType: editItem.obligationType,
                moneyAmount: String(editItem.moneyAmount || ""),
                animalType: editItem.animalType || "",
                quantity: String(editItem.quantity || ""),
                dateReceived: editItem.dateReceived?.slice(0, 10) || "",
                notes: editItem.notes || "",
              }
            : undefined
        }
        onSubmit={async (v: ReceiptFormValues) => {
          if (!editItem) return;
          await updateReceipt.mutateAsync({ id: editItem.id, data: buildReceiptPayload(v) });
          toast.success("Berhasil diperbarui");
          setEditItem(null);
        }}
        loading={updateReceipt.isPending}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Penerimaan</DialogTitle>
            <DialogDescription>Hapus catatan penerimaan ini?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Batal</Button>
            <Button
              variant="destructive"
              disabled={deleteReceipt.isPending}
              onClick={async () => {
                if (!deleteItem) return;
                await deleteReceipt.mutateAsync(deleteItem.id);
                toast.success("Berhasil dihapus");
                setDeleteItem(null);
              }}
            >
              {deleteReceipt.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
