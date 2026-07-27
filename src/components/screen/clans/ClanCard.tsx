import { useState } from "react";
import { useCreateDoc } from "@/hooks/useLocalMutation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuLabel,
  ContextMenuSeparator, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Users, Crown, User, Network, GitFork, Plus, ChevronDown, ChevronUp,
  Skull, Heart, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import type { Clan, Participant } from "@/db/types";
import { ROLE_META, RELATION_TYPE_LABELS } from "./types";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

// ─── Role icon map ────────────────────────────────────────────────────────────

const ROLE_ICONS: Record<string, React.ReactNode> = {
  head: <Crown className="size-3" />,
  member: <User className="size-3" />,
  ancestor: <Network className="size-3" />,
};

// ─── ClanCard ─────────────────────────────────────────────────────────────────

export function ClanCard({
  clan, participants, participantById, onAddMember, onEditClan, onEditParticipant, onShowGraph,
}: {
  clan: Clan;
  participants: Participant[];
  participantById: Record<string, Participant>;
  onAddMember: () => void;
  onEditClan: () => void;
  onEditParticipant: (p: Participant) => void;
  onShowGraph: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const createGroup = useCreateDoc("groups");

  const sorted = [...participants].sort((a, b) => {
    const order: Record<string, number> = { head: 0, ancestor: 1, member: 2 };
    return (order[a.role] ?? 3) - (order[b.role] ?? 3);
  });
  const visible = expanded ? sorted : sorted.slice(0, 5);
  const hasMore = sorted.length > 5;

  async function createEvent(type: "rambu-solo" | "rambu-tuka") {
    const isRambuSolo = type === "rambu-solo";
    await createGroup.mutateAsync({
      name: `${isRambuSolo ? "Rambu Solo'" : "Rambu Tuka'"} — ${clan.name}`,
      eventName: isRambuSolo ? "Rambu Solo'" : "Rambu Tuka'",
      description: isRambuSolo
        ? `Upacara pemakaman dari ${clan.name}.`
        : `Pesta syukur / pernikahan dari ${clan.name}.`,
      members: [clan.id],
    });
    toast.success(
      `Grup ${isRambuSolo ? "Rambu Solo'" : "Rambu Tuka'"} berhasil dibuat`,
      { description: "Buka menu Grup untuk mengelola acara ini." }
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger className="block">
        <Card className="hover:shadow-md transition-shadow cursor-default">
          <CardHeader className="border-b bg-muted/30 py-3 px-4">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm truncate">{clan.name}</h3>
                  <span className="flex items-center gap-0.5 text-xs text-muted-foreground shrink-0">
                    <Users className="size-3" />{participants.length}
                  </span>
                </div>
                {clan.region && (
                  <p className="text-xs text-muted-foreground mt-0.5">{clan.region}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button" variant="ghost" size="icon" className="size-7"
                  onClick={onShowGraph} title="Lihat pohon keluarga"
                >
                  <GitFork className="size-3.5" />
                </Button>
                <Button
                  type="button" variant="ghost" size="icon" className="size-7"
                  onClick={onAddMember} title="Tambah anggota"
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-3 flex flex-col gap-0.5">
            {sorted.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">
                Belum ada anggota terdaftar
              </p>
            ) : (
              <>
                {visible.map((p) => {
                  const meta = ROLE_META[p.role] ?? ROLE_META.member;
                  const icon = ROLE_ICONS[p.role] ?? ROLE_ICONS.member;
                  const isHead = p.role === "head";
                  const isDead = p.passedAway === true;
                  const tooltip = (p.relations ?? [])
                    .map((r) => {
                      const related = participantById[r.participantId];
                      if (!related) return null;
                      return `${RELATION_TYPE_LABELS[r.type] ?? r.type}: ${related.name}`;
                    })
                    .filter(Boolean)
                    .join(" · ");

                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={[
                        "w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-left",
                        isHead && !isDead ? "bg-amber-50 dark:bg-amber-950/20" : "hover:bg-muted/50",
                        isDead ? "opacity-50" : "",
                      ].join(" ")}
                      onClick={() => onEditParticipant(p)}
                      title={tooltip || undefined}
                    >
                      {!isHead && (
                        <span className="ml-2 shrink-0 w-3 h-px bg-border" aria-hidden />
                      )}
                      <span className="shrink-0 size-5 rounded-full bg-muted border flex items-center justify-center">
                        {isDead ? <Skull className="size-3 text-muted-foreground" /> : icon}
                      </span>
                      <span className={[
                        "flex-1 min-w-0 truncate",
                        isHead ? "font-medium" : "",
                        isDead ? "line-through text-muted-foreground" : "",
                      ].join(" ")}>
                        {p.name}
                      </span>
                      {isDead ? (
                        <Badge variant="outline" className="ml-auto text-[10px] py-0 shrink-0 bg-gray-100 text-gray-500 border-gray-200">
                          Almarhum
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className={`ml-auto text-[10px] py-0 shrink-0 ${meta.className}`}
                        >
                          {meta.label}
                        </Badge>
                      )}
                    </button>
                  );
                })}


              </>
            )}
          </CardContent>
          <CardFooter className="p-0">
            {hasMore && (
              <Button
                type="button" variant="ghost" size="sm"
                className="w-full text-xs text-primary gap-1"
                onClick={() => setExpanded((e) => !e)}
              >
                {expanded
                  ? <><ChevronUp className="size-3" /> Tampilkan lebih sedikit</>
                  : <><ChevronDown className="size-3" /> +{sorted.length - 5} anggota lagi</>}
              </Button>
            )}
          </CardFooter>
        </Card>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-52">
        <ContextMenuLabel>{clan.name}</ContextMenuLabel>
        <ContextMenuSeparator />

        <ContextMenuItem onClick={onAddMember}>
          <Plus className="size-4" /> Tambah Anggota
        </ContextMenuItem>
        <ContextMenuItem onClick={onShowGraph}>
          <GitFork className="size-4" /> Pohon Keluarga
        </ContextMenuItem>
        <ContextMenuItem onClick={onEditClan}>
          <Pencil className="size-4" /> Edit Rumpun
        </ContextMenuItem>

        <ContextMenuSeparator />
        <ContextMenuLabel>Buat Acara Cepat</ContextMenuLabel>

        <ContextMenuItem onClick={() => createEvent("rambu-solo")} disabled={createGroup.isPending}>
          <Skull className="size-4" />
          Rambu Solo' (Pemakaman)
        </ContextMenuItem>
        <ContextMenuItem onClick={() => createEvent("rambu-tuka")} disabled={createGroup.isPending}>
          <Heart className="size-4" />
          Rambu Tuka' (Syukuran)
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// ─── ClanFamilyTree (grid of ClanCards) ──────────────────────────────────────

export function ClanFamilyTree({
  clans, participantsByClan, participantById, loading,
  onAddMember, onEditClan, onEditParticipant, onShowGraph,
}: {
  clans: Clan[];
  participantsByClan: Record<string, Participant[]>;
  participantById: Record<string, Participant>;
  loading: boolean;
  onAddMember: (clan: Clan) => void;
  onEditClan: (clan: Clan) => void;
  onEditParticipant: (p: Participant) => void;
  onShowGraph: (clan: Clan) => void;
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
      <div className="space-y-4 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4 space-y-3">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-8 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (clans.length === 0) {
    return (
      <div className="pt-4">
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <Network className="size-10 opacity-30" />
            </EmptyMedia>
            <EmptyTitle>Belum ada rumpun keluarga terdaftar.</EmptyTitle>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="w-full sm:w-72">
        <input
          className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="Cari rumpun atau wilayah..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <Empty className="py-4 border-none">
          <EmptyHeader>
            <EmptyTitle>Tidak ada rumpun yang cocok.</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((clan) => (
            <ClanCard
              key={clan.id}
              clan={clan}
              participants={participantsByClan[clan.id] ?? []}
              participantById={participantById}
              onAddMember={() => onAddMember(clan)}
              onEditClan={() => onEditClan(clan)}
              onEditParticipant={onEditParticipant}
              onShowGraph={() => onShowGraph(clan)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
