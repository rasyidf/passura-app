import { useState } from "react";
import Dexie from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { db } from "@/db/local-db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import type { SettingsTabProps } from "./SettingsScreen";

// ── Dexie table name mapping ──────────────────────────────────────────────────
// "animal-types" → "animalTypes"; all other entity types match the table name directly.
function entityTypeToTableName(entityType: string): string {
  if (entityType === "animal-types") return "animalTypes";
  return entityType;
}

// Typed lookup so we avoid casting db to `any`
const TABLE_MAP: Record<string, Dexie.Table | undefined> = {
  clans: db.clans,
  animalTypes: db.animalTypes,
  groups: db.groups,
  elders: db.elders,
  participants: db.participants,
  loans: db.loans,
  receipts: db.receipts,
  handovers: db.handovers,
};

// ── Read appConfig at call time ───────────────────────────────────────────────
async function getApiBase(): Promise<string> {
  const cfg = await db.appConfig.get("api-url");
  const stored = cfg?.value as string | undefined;
  if (stored && stored.trim()) return stored.trim();
  return (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8787";
}

async function getSyncToken(): Promise<string | null> {
  const cfg = await db.appConfig.get("sync-token");
  return (cfg?.value as string) ?? null;
}

// ── ConflictsTab ──────────────────────────────────────────────────────────────
export default function ConflictsTab({ isSuperadmin }: SettingsTabProps) {
  const conflicts = useLiveQuery(
    () => db.syncLog.where("syncStatus").equals("conflict").toArray(),
    []
  );

  // Track per-row loading state (keyed by syncLog entry id)
  const [loadingRows, setLoadingRows] = useState<Record<number, boolean>>({});

  function setRowLoading(id: number, loading: boolean) {
    setLoadingRows((prev) => ({ ...prev, [id]: loading }));
  }

  // ── "Discard Local" handler ─────────────────────────────────────────────────
  // Calls GET /api/:entityType/:entityId; on success replaces local record with
  // the server version and deletes the syncLog entry.
  async function handleDiscardLocal(entryId: number, entityType: string, entityId: string) {
    setRowLoading(entryId, true);
    try {
      const apiBase = await getApiBase();
      const token = await getSyncToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${apiBase}/api/${entityType}/${entityId}`, { headers });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        toast.error(
          `Gagal mengambil data server: ${(errBody as any).error ?? res.statusText}`
        );
        return;
      }

      const serverRecord = await res.json() as Record<string, unknown>;
      const tableName = entityTypeToTableName(entityType);
      const table = TABLE_MAP[tableName];

      if (!table) {
        toast.error(`Tabel tidak ditemukan untuk tipe entitas: ${entityType}`);
        return;
      }

      // Replace the local record with the server record and delete the conflict entry
      await db.transaction("rw", db.syncLog, table, async () => {
        await table.put(serverRecord);
        await db.syncLog.delete(entryId);
      });

      toast.success("Perubahan lokal dibuang. Data server diterapkan.");
    } catch (err) {
      toast.error(
        `Gagal mengambil data server: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setRowLoading(entryId, false);
    }
  }

  // ── "Keep Local" handler ────────────────────────────────────────────────────
  // Sets the syncLog entry's syncStatus back to "pending" so it will be
  // retried on the next sync, overwriting the server version.
  async function handleKeepLocal(entryId: number) {
    setRowLoading(entryId, true);
    try {
      await db.syncLog.update(entryId, { syncStatus: "pending", syncError: undefined });
      toast.success("Perubahan lokal akan disinkronkan pada sync berikutnya.");
    } catch (err) {
      toast.error(
        `Gagal memperbarui entri: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setRowLoading(entryId, false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (!conflicts) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="size-5 text-muted-foreground" />
      </div>
    );
  }

  if (conflicts.length === 0) {
    return (
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyTitle>Tidak ada konflik sinkronisasi</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-medium">Konflik Sinkronisasi</h2>
        <Badge variant="destructive">{conflicts.length}</Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipe Entitas</TableHead>
            <TableHead>ID Entitas</TableHead>
            <TableHead>Aksi</TableHead>
            <TableHead>Error</TableHead>
            {isSuperadmin && <TableHead className="text-right">Tindakan</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {conflicts.map((entry) => {
            const rowId = entry.id!;
            const isLoading = !!loadingRows[rowId];

            return (
              <TableRow key={rowId}>
                <TableCell>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {entry.entityType}
                  </code>
                </TableCell>
                <TableCell>
                  <span
                    className="text-xs font-mono text-muted-foreground truncate max-w-[140px] inline-block"
                    title={entry.entityId}
                  >
                    {entry.entityId}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs capitalize">
                    {entry.action}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span
                    className="text-xs text-destructive truncate max-w-[200px] inline-block"
                    title={entry.syncError}
                  >
                    {entry.syncError ?? "—"}
                  </span>
                </TableCell>
                {isSuperadmin && (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isLoading}
                        onClick={() =>
                          handleDiscardLocal(rowId, entry.entityType, entry.entityId)
                        }
                      >
                        Buang Lokal
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isLoading}
                        onClick={() => handleKeepLocal(rowId)}
                      >
                        Pertahankan Lokal
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
