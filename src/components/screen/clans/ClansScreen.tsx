import { useState, useMemo } from "react";
import { useLocalQuery } from "@/hooks/useLocalQuery";
import { useCreateDoc, useUpdateDoc, useDeleteDoc } from "@/hooks/useLocalMutation";
import { useForm, Controller } from "react-hook-form";
import DataTable from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Users, Network } from "lucide-react";
import type { Clan, Participant } from "@/db/types";

import { ClanFamilyTree } from "./ClanCard";
import { FamilyGraphDialog } from "./FamilyGraph";
import { ParticipantFormDialog } from "./ParticipantFormDialog";
import { type ClanFormValues, type ParticipantFormValues } from "./types";

export default function ClansScreen() {
  const { data, isLoading } = useLocalQuery<Clan>("clans");
  const { data: participantsData, refetch: refetchParticipants } = useLocalQuery<Participant>("participants");
  const createClan = useCreateDoc("clans");
  const updateClan = useUpdateDoc("clans");
  const deleteClan = useDeleteDoc("clans");
  const createParticipant = useCreateDoc("participants");
  const updateParticipant = useUpdateDoc("participants");

  const [editItem, setEditItem] = useState<Clan | null>(null);
  const [deleteItem, setDeleteItem] = useState<Clan | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [graphClan, setGraphClan] = useState<Clan | null>(null);
  const [addMemberClan, setAddMemberClan] = useState<Clan | null>(null);
  const [editParticipant, setEditParticipant] = useState<Participant | null>(null);

  const clans = data?.docs ?? [];
  const participants = participantsData?.docs ?? [];

  const participantsByClan = useMemo(() => {
    const map: Record<string, Participant[]> = {};
    for (const p of participants) {
      if (!map[p.clan]) map[p.clan] = [];
      map[p.clan].push(p);
    }
    return map;
  }, [participants]);

  const participantById = useMemo(
    () => Object.fromEntries(participants.map((p) => [p.id, p])),
    [participants]
  );

  const columns: ColumnDef<Clan>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: "Nama Rumpun",
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "region",
      header: "Wilayah",
      cell: ({ row }) => row.original.region
        ? <Badge variant="outline" className="text-xs">{row.original.region}</Badge>
        : <span className="text-muted-foreground text-xs">—</span>,
    },
    {
      id: "memberCount",
      header: "Anggota",
      cell: ({ row }) => {
        const count = participantsByClan[row.original.id]?.length ?? 0;
        return (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="size-3.5" />{count}
          </span>
        );
      },
    },
  ], [participantsByClan]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold">Rumpun Keluarga</h1>
          <p className="text-sm text-muted-foreground">
            Kelola data rumpun keluarga dan lihat pohon keluarga.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="lg" className="gap-2">
          <Plus className="size-4" /> Tambah Rumpun
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list" className="gap-2">
            <Users className="size-4" /> Daftar
          </TabsTrigger>
          <TabsTrigger value="tree" className="gap-2">
            <Network className="size-4" /> Pohon Keluarga
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <DataTable
            data={clans}
            columns={columns}
            searchableColumnIds={["name", "region"]}
            searchPlaceholder="Cari rumpun..."
            loading={isLoading}
            onEdit={(row) => setEditItem(row)}
            onDelete={(row) => setDeleteItem(row)}
            emptyMessage="Belum ada rumpun keluarga terdaftar."
          />
        </TabsContent>

        <TabsContent value="tree" className="mt-4">
          <ClanFamilyTree
            clans={clans}
            participantsByClan={participantsByClan}
            participantById={participantById}
            loading={isLoading}
            onAddMember={(clan) => setAddMemberClan(clan)}
            onEditClan={(clan) => setEditItem(clan)}
            onEditParticipant={(p) => setEditParticipant(p)}
            onShowGraph={(clan) => setGraphClan(clan)}
          />
        </TabsContent>
      </Tabs>

      {/* ── Clan CRUD ── */}
      <ClanFormDialog
        open={showCreate} onOpenChange={setShowCreate} title="Tambah Rumpun Baru"
        onSubmit={async (v) => {
          await createClan.mutateAsync(v);
          toast.success("Rumpun berhasil ditambahkan");
          setShowCreate(false);
        }}
        loading={createClan.isPending}
      />

      <ClanFormDialog
        open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)} title="Edit Rumpun"
        defaultValues={editItem ? { name: editItem.name, region: editItem.region ?? "" } : undefined}
        onSubmit={async (v) => {
          if (!editItem) return;
          await updateClan.mutateAsync({ id: editItem.id, data: v });
          toast.success("Rumpun berhasil diperbarui");
          setEditItem(null);
        }}
        loading={updateClan.isPending}
      />

      <Dialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Rumpun</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus rumpun <strong>{deleteItem?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Batal</Button>
            <Button
              variant="destructive" disabled={deleteClan.isPending}
              onClick={async () => {
                if (!deleteItem) return;
                await deleteClan.mutateAsync(deleteItem.id);
                toast.success("Rumpun berhasil dihapus");
                setDeleteItem(null);
              }}
            >
              {deleteClan.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Participant dialogs ── */}
      <ParticipantFormDialog
        open={!!addMemberClan} onOpenChange={(o) => !o && setAddMemberClan(null)}
        title={`Tambah Anggota — ${addMemberClan?.name ?? ""}`}
        clanId={addMemberClan?.id ?? ""} participants={participants}
        onSubmit={async (v) => {
          await createParticipant.mutateAsync(v);
          toast.success("Anggota berhasil ditambahkan");
          setAddMemberClan(null);
          refetchParticipants();
        }}
        loading={createParticipant.isPending}
      />

      <ParticipantFormDialog
        open={!!editParticipant} onOpenChange={(o) => !o && setEditParticipant(null)}
        title="Edit Anggota"
        clanId={editParticipant?.clan ?? ""} participants={participants}
        defaultValues={editParticipant ? {
          name: editParticipant.name,
          clan: editParticipant.clan,
          role: editParticipant.role,
          gender: editParticipant.gender ?? "",
          passedAway: editParticipant.passedAway ?? false,
          notes: editParticipant.notes ?? "",
          relations: (editParticipant.relations ?? []).map((r) => ({
            type: r.type, participantId: r.participantId, notes: r.notes ?? "",
          })),
        } : undefined}
        onSubmit={async (v) => {
          if (!editParticipant) return;
          await updateParticipant.mutateAsync({ id: editParticipant.id, data: v });
          toast.success("Anggota berhasil diperbarui");
          setEditParticipant(null);
          refetchParticipants();
        }}
        loading={updateParticipant.isPending}
      />

      {/* ── Family graph ── */}
      {graphClan && (
        <FamilyGraphDialog
          open={!!graphClan} onOpenChange={(o) => !o && setGraphClan(null)}
          clan={graphClan}
          participants={participantsByClan[graphClan.id] ?? []}
          participantById={participantById}
        />
      )}
    </div>
  );
}

// ─── Clan Form Dialog ─────────────────────────────────────────────────────────

function ClanFormDialog({ open, onOpenChange, title, defaultValues, onSubmit, loading }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  defaultValues?: ClanFormValues;
  onSubmit: (v: ClanFormValues) => Promise<void>;
  loading: boolean;
}) {
  const defaults = defaultValues ?? { name: "", region: "" };
  const { control, handleSubmit } = useForm<ClanFormValues>({ defaultValues: defaults, values: defaults });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            control={control} name="name" rules={{ required: "Nama wajib diisi" }}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Nama Rumpun</FieldLabel>
                <Input id={field.name} placeholder="Tongkonan Rante" aria-invalid={fieldState.invalid} {...field} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            control={control} name="region"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Wilayah</FieldLabel>
                <Input id={field.name} placeholder="Rantepao, Makale, dll." aria-invalid={fieldState.invalid} {...field} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
