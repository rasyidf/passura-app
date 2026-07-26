import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { db } from "@/db/local-db";
import { CloudflareD1Adapter } from "@/sync/adapters/cloudflare-d1";
import type { SyncEntry } from "@/sync/sync-adapter";
import { toast } from "sonner";

type SyncState = "idle" | "pushing" | "pulling" | "error" | "success";

const adapter = new CloudflareD1Adapter();

const ENTITY_TABLE_MAP: Record<string, any> = {
  clans: "clans",
  elders: "elders",
  participants: "participants",
  groups: "groups",
  animalTypes: "animalTypes",
  loans: "loans",
  receipts: "receipts",
  handovers: "handovers",
  obligations: "obligations",
};

export function useSync() {
  const qc = useQueryClient();
  const [state, setState] = useState<SyncState>("idle");
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  const countPending = useCallback(async () => {
    const count = await db.syncLog.where("syncStatus").equals("pending").count();
    setPendingCount(count);
    return count;
  }, []);

  const sync = useCallback(async () => {
    if (!navigator.onLine) {
      toast.warning("Tidak ada koneksi internet.");
      return;
    }
    if (!adapter.isAvailable()) {
      toast.error("Belum login ke server. Konfigurasikan sinkronisasi terlebih dahulu.");
      return;
    }

    try {
      // ── 1. Push pending local changes ────────────────────────────────────
      setState("pushing");
      const pending = await db.syncLog.where("syncStatus").equals("pending").toArray();

      if (pending.length > 0) {
        const entries: SyncEntry[] = pending.map((e) => ({
          entityType: e.entityType,
          entityId: e.entityId,
          action: e.action,
          data: e.data,
          timestamp: e.createdAt,
        }));

        const pushResult = await adapter.push("passura", entries);

        // Mark accepted entries as synced
        const acceptedIds = pending
          .filter((_, i) => !pushResult.rejected.find((r) => r.id === pending[i].entityId))
          .map((e) => e.id!)
          .filter(Boolean);

        await db.syncLog.bulkUpdate(
          acceptedIds.map((id) => ({ key: id, changes: { syncStatus: "synced" } })),
        );

        if (pushResult.rejected.length > 0) {
          console.warn("[sync] rejected entries:", pushResult.rejected);
        }
      }

      // ── 2. Pull server changes ────────────────────────────────────────────
      setState("pulling");
      const cursorConfig = await db.appConfig.get("sync-cursor");
      const cursors = { _global: (cursorConfig?.value as string) ?? "0" };

      const pullResult = await adapter.pull("passura", cursors);

      // Apply pulled entities to local Dexie
      for (const { type, data } of pullResult.entities) {
        const tableName = type === "animal-types" ? "animalTypes" : type;
        const table = (db as any)[tableName];
        if (!table) continue;
        for (const row of data) {
          await table.put({ ...(row as object), syncStatus: "synced" });
        }
      }

      // Save new cursor
      await db.appConfig.put({ key: "sync-cursor", value: pullResult.cursors["_global"] ?? cursors._global });

      // Invalidate all queries to refresh UI
      await qc.invalidateQueries();

      setState("success");
      setLastSyncAt(new Date());
      setPendingCount(0);
      toast.success("Sinkronisasi berhasil!");

      setTimeout(() => setState("idle"), 3000);
    } catch (err) {
      setState("error");
      const msg = err instanceof Error ? err.message : "Gagal sinkronisasi";
      toast.error(msg);
      setTimeout(() => setState("idle"), 5000);
    }
  }, [qc]);

  return { state, pendingCount, lastSyncAt, sync, countPending };
}
