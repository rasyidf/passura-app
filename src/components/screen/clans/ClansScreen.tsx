import { useState, useMemo } from "react";
import { useLocalQuery } from "@/hooks/useLocalQuery";
import { useCreateDoc, useUpdateDoc, useDeleteDoc } from "@/hooks/useLocalMutation";
import { useForm, Controller } from "react-hook-form";
import DataTable from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Users, Network, Crown, User } from "lucide-react";
import type { Clan, Participant } from "@/db/types";

type FormValues = { name: string; region: string };

const ROLE_META: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  head:     { label: "Kepala",  icon: <Crown className="size-3" />,   className: "bg-amber-100 text-amber-700 border-amber-200" },
  member:   { label: "Anggota", icon: <User className="size-3" />,    className: "bg-sky-100 text-sky-700 border-sky-200" },
  ancestor: { label: "Leluhur", icon: <Network className="size-3" />, className: "bg-purple-100 text-purple-700 border-purple-200" },
};

export default function ClansScreen() {
  const { data, isLoading } = useLocalQuery<Clan>("clans");
  const { data: participantsData } = useLocalQuery<Participant>("participants");
  const createClan = useCreateDoc("clans");
  const updateClan = useUpdateDoc("clans");
  const deleteClan = useDeleteDoc("clans");

  const [editItem, setEditItem] = useState<Clan | null>(null);
  const [deleteItem, setDeleteItem] = useState<Clan | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const clans = data?.docs ?? [];
  const participants = participantsData?.docs ?? [];

  // Group participants by clan
  const participantsByClan = useMemo(() => {
    const map: Record<string, Participant[]> = {};
    for (const p of participants) {
      if (!map[p.clan]) map[p.clan] = [];
      map[p.clan].push(p);
    }
    return map;
  }, [participants]);

  const columns: ColumnDef<Clan>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: "Nama Clan",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
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
            <Users className="size-3.5" />
            {count}
          </span>
        );
      },
    },
  ], [participantsByClan]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold">Clan / Rumpun Keluarga</h1>
          <p className="text-sm text-muted-foreground">Kelola data clan dan lihat pohon keluarga.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="size-4" /> Tambah Clan
        </Button>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list" className="gap-2"><Users className="size-4" /> Daftar</TabsTrigger>
          <TabsTrigger value="tree" className="gap-2"><Network className="size-4" /> Pohon Keluarga</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <DataTable
            data={clans}
            columns={columns}
            searchableColumnIds={["name", "region"]}
            searchPlaceholder="Cari clan..."
            loading={isLoading}
            onEdit={(row) => setEditItem(row)}
            onDelete={(row) => setDeleteItem(row)}
            emptyMessage="Belum ada clan terdaftar."
          />
        </TabsContent>

        <TabsContent value="tree" className="mt-4">
          <ClanFamilyTree
            clans={clans}
            participantsByClan={participantsByClan}
            loading={isLoading}
          />
        </TabsContent>
      </Tabs>

      <ClanFormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        title="Tambah Clan Baru"
        onSubmit={async (values) => {
          await createClan.mutateAsync(values);
          toast.success("Clan berhasil ditambahkan");
          setShowCreate(false);
        }}
        loading={createClan.isPending}
      />

      <ClanFormDialog
        open={!!editItem}
        onOpenChange={(open) => !open && setEditItem(null)}
        title="Edit Clan"
        defaultValues={editItem ? { name: editItem.name, region: editItem.region || "" } : undefined}
        onSubmit={async (values) => {
          if (!editItem) return;
          await updateClan.mutateAsync({ id: editItem.id, data: values });
          toast.success("Clan berhasil diperbarui");
          setEditItem(null);
        }}
        loading={updateClan.isPending}
      />

      <Dialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Clan</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus clan <strong>{deleteItem?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Batal</Button>
            <Button variant="destructive" disabled={deleteClan.isPending} onClick={async () => {
              if (!deleteItem) return;
              await deleteClan.mutateAsync(deleteItem.id);
              toast.success("Clan berhasil dihapus");
              setDeleteItem(null);
            }}>
              {deleteClan.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Family Tree ──────────────────────────────────────────────────────────────

function ClanFamilyTree({
  clans,
  participantsByClan,
  loading,
}: {
  clans: Clan[];
  participantsByClan: Record<string, Participant[]>;
  loading: boolean;
}) {
  const [search, setSearch] = useState("");

  const filtered = search
    ? clans.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.region?.toLowerCase().includes(search.toLowerCase())
      )
    : clans;

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-4 space-y-3">
            <div className="h-5 w-1/2 rounded bg-muted animate-pulse" />
            <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
            <div className="space-y-2 pt-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-8 rounded bg-muted animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (clans.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
        <Network className="size-10 mx-auto mb-3 opacity-30" />
        <p>Belum ada clan terdaftar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative w-full sm:w-72">
        <Input
          placeholder="Cari clan atau wilayah..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">Tidak ada clan yang cocok.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((clan) => (
            <ClanCard
              key={clan.id}
              clan={clan}
              participants={participantsByClan[clan.id] ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ClanCard({ clan, participants }: { clan: Clan; participants: Participant[] }) {
  const [expanded, setExpanded] = useState(false);

  const sorted = [...participants].sort((a, b) => {
    const order = { head: 0, ancestor: 1, member: 2 };
    return (order[a.role] ?? 3) - (order[b.role] ?? 3);
  });

  const visible = expanded ? sorted : sorted.slice(0, 5);
  const hasMore = sorted.length > 5;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="border-b bg-muted/30 py-3 px-4 flex-row items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm truncate">{clan.name}</h3>
          {clan.region && (
            <p className="text-xs text-muted-foreground mt-0.5">{clan.region}</p>
          )}
        </div>
        <Badge variant="outline" className="shrink-0 text-xs">
          <Users className="size-3 mr-1" />
          {participants.length}
        </Badge>
      </CardHeader>

      <CardContent className="p-3 space-y-1">
        {sorted.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            Belum ada anggota terdaftar
          </p>
        ) : (
          <>
            {visible.map((p, idx) => {
              const meta = ROLE_META[p.role] ?? ROLE_META.member;
              const isHead = p.role === "head";
              return (
                <div
                  key={p.id}
                  className={[
                    "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm",
                    isHead ? "bg-amber-50 dark:bg-amber-950/20" : "hover:bg-muted/50",
                    idx < visible.length - 1 ? "relative" : "",
                  ].join(" ")}
                >
                  {!isHead && (
                    <span className="ml-2 shrink-0 w-3 h-px bg-border" aria-hidden />
                  )}
                  <span className="shrink-0 size-5 rounded-full bg-muted border flex items-center justify-center">
                    {meta.icon}
                  </span>
                  <span className={isHead ? "font-medium" : ""}>{p.name}</span>
                  <Badge variant="outline" className={`ml-auto text-[10px] py-0 ${meta.className}`}>
                    {meta.label}
                  </Badge>
                  {p.notes && (
                    <span className="sr-only">{p.notes}</span>
                  )}
                </div>
              );
            })}

            {hasMore && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-xs text-primary"
                onClick={() => setExpanded((e) => !e)}
              >
                {expanded
                  ? "Tampilkan lebih sedikit"
                  : `+${sorted.length - 5} anggota lagi`}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

function ClanFormDialog({ open, onOpenChange, title, defaultValues, onSubmit, loading }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string;
  defaultValues?: FormValues; onSubmit: (v: FormValues) => Promise<void>; loading: boolean;
}) {
  const defaults = defaultValues || { name: "", region: "" };
  const { control, handleSubmit } = useForm<FormValues>({ defaultValues: defaults, values: defaults });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Controller control={control} name="name" rules={{ required: "Nama wajib diisi" }} render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Nama Clan</FieldLabel>
                <Input id={field.name} placeholder="Tongkonan Rante" aria-invalid={fieldState.invalid} {...field} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )} />
            <Controller control={control} name="region" render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Wilayah</FieldLabel>
                <Input id={field.name} placeholder="Rantepao, Makale, dll." aria-invalid={fieldState.invalid} {...field} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
