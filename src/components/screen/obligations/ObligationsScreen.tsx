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
import type { Obligation, Clan, AnimalType } from "@/db/types";
import { MoneyCell } from "@/components/ui/money-cell";
import { ClanLink, AnimalLink } from "@/components/shared/screen-helpers";
import { ObligationFormDialog } from "./ObligationFormDialog";
import {
  ASSET_BADGE, buildObligationPayload, type ObligationFormValues,
} from "./obligations.constants";

export default function ObligationsScreen() {
  const { data, isLoading } = useLocalQuery<Obligation>("obligations");
  const { data: clansData } = useLocalQuery<Clan>("clans");
  const { data: animalsData } = useLocalQuery<AnimalType>("animal-types");
  const createObligation = useCreateDoc("obligations");
  const updateObligation = useUpdateDoc("obligations");
  const deleteObligation = useDeleteDoc("obligations");

  const [editItem, setEditItem] = useState<Obligation | null>(null);
  const [deleteItem, setDeleteItem] = useState<Obligation | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const clans = clansData?.docs ?? [];
  const animalTypes = animalsData?.docs ?? [];
  const rows = data?.docs ?? [];

  const clanMap = useClanMap();
  const animalMap = useAnimalTypeMap();

  const columns: ColumnDef<Obligation>[] = useMemo(
    () => [
      { accessorKey: "event", header: "Acara" },
      {
        accessorKey: "date",
        header: "Tanggal",
        filterFn: "dateRange" as never,
        cell: ({ row }) => row.original.date?.slice(0, 10) || "-",
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
        accessorKey: "paymentType",
        header: "Jenis",
        cell: ({ row }) => {
          const b = ASSET_BADGE[row.original.paymentType] ?? {
            label: row.original.paymentType,
            className: "bg-gray-100 text-gray-600 border-gray-200",
          };
          const badge = <Badge variant="outline" className={b.className}>{b.label}</Badge>;
          if (row.original.paymentType === "animal" && row.original.animalType) {
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

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold">Kewajiban</h1>
          <p className="text-sm text-muted-foreground">
            Catatan kewajiban adat antar rumpun keluarga.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="lg" className="gap-2">
          <Plus className="size-4" /> Catat Kewajiban
        </Button>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        searchableColumnIds={["event"]}
        searchPlaceholder="Cari kewajiban..."
        filters={[{ id: "date", label: "Tanggal", type: "daterange" as const }]}
        loading={isLoading}
        onEdit={(r) => setEditItem(r)}
        onDelete={(r) => setDeleteItem(r)}
        emptyMessage="Belum ada data kewajiban."
      />

      {/* Create dialog */}
      <ObligationFormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        title="Catat Kewajiban Baru"
        clans={clans}
        animalTypes={animalTypes}
        onSubmit={async (v: ObligationFormValues) => {
          await createObligation.mutateAsync(buildObligationPayload(v));
          toast.success("Kewajiban berhasil dicatat");
          setShowCreate(false);
        }}
        loading={createObligation.isPending}
      />

      {/* Edit dialog */}
      <ObligationFormDialog
        open={!!editItem}
        onOpenChange={(o) => !o && setEditItem(null)}
        title="Edit Kewajiban"
        clans={clans}
        animalTypes={animalTypes}
        defaultValues={
          editItem
            ? {
                giver: editItem.giver,
                receiver: editItem.receiver,
                paymentType: editItem.paymentType,
                animalType: editItem.animalType || "",
                moneyAmount: String(editItem.moneyAmount || ""),
                quantity: String(editItem.quantity),
                event: editItem.event,
                date: editItem.date?.slice(0, 10) || "",
              }
            : undefined
        }
        onSubmit={async (v: ObligationFormValues) => {
          if (!editItem) return;
          await updateObligation.mutateAsync({ id: editItem.id, data: buildObligationPayload(v) });
          toast.success("Berhasil diperbarui");
          setEditItem(null);
        }}
        loading={updateObligation.isPending}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Kewajiban</DialogTitle>
            <DialogDescription>
              Hapus kewajiban <strong>{deleteItem?.event}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Batal</Button>
            <Button
              variant="destructive"
              disabled={deleteObligation.isPending}
              onClick={async () => {
                if (!deleteItem) return;
                await deleteObligation.mutateAsync(deleteItem.id);
                toast.success("Berhasil dihapus");
                setDeleteItem(null);
              }}
            >
              {deleteObligation.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
