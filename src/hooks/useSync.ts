import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Dexie from "dexie";
import { db } from "@/db/local-db";
import { CloudflareD1Adapter, AuthError } from "@/sync/adapters/cloudflare-d1";
import type { SyncEntry } from "@/sync/sync-adapter";
import { toast } from "sonner";

type SyncState = "idle" | "pushing" | "pulling" | "error" | "success";

const PUSH_BATCH_SIZE = 200;

const adapter = new CloudflareD1Adapter();

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
    // ── Offline guard ─────────────────────────────────────────────────────
    if (!navigator.onLine) {
      toast.warning("Tidak ada koneksi internet. Sinkronisasi tidak dilakukan.");
      return;
    }

    if (!adapter.isAvailable()) {
      toast.error("Belum login ke server. Konfigurasikan sinkronisasi terlebih dahulu.");
      return;
    }

    try {
      // ── 1. Push pending local changes ────────────────────────────────────
      setState("pushing");

      // Read tenantId from appConfig (Requirement 4.2)
      const tenantCfg = await db.appConfig.get("tenant-id");
      const tenantId = (tenantCfg?.value as string) ?? "";

      const pending = await db.syncLog.where("syncStatus").equals("pending").toArray();

      if (pending.length > 0) {
        // Split into batches of at most 200 (Requirement 4.1)
        for (let i = 0; i < pending.length; i += PUSH_BATCH_SIZE) {
          const batch = pending.slice(i, i + PUSH_BATCH_SIZE);

          const entries: SyncEntry[] = batch.map((e) => ({
            entityType: e.entityType,
            entityId: e.entityId,
            action: e.action,
            data: e.data,
            timestamp: e.createdAt,
          }));

          let pushResult: Awaited<ReturnType<typeof adapter.push>>;
          try {
            pushResult = await adapter.push(tenantId, entries);
          } catch (err) {
            if (err instanceof AuthError) {
              // 401: delete token, update state, prompt re-auth (Requirement 6.5)
              await db.appConfig.delete("sync-token");
              setState("error");
              toast.error("Sesi server berakhir. Silakan autentikasi ulang di halaman Pengaturan.");
              return;
            }
            // Network error or 5xx: leave all batch entries as 'pending' (Requirement 4.6)
            toast.error("Gagal mengirim data ke server. Data yang belum disinkronkan tetap tersimpan.");
            setState("error");
            setTimeout(() => setState("idle"), 5000);
            return;
          }

          // Build a map from entityId → syncLog row for this batch (Requirement 4.8)
          const batchById = new Map(batch.map((e) => [e.entityId, e]));

          // Process each per-entry result individually
          for (const result of pushResult.results) {
            const entry = batchById.get(result.id);
            if (!entry || entry.id == null) continue;

            if (result.status === "synced") {
              // Accepted: mark as synced (Requirement 4.3)
              await db.syncLog.update(entry.id, { syncStatus: "synced" });
            } else if (result.status === "conflict") {
              // Conflict: record status and reason (Requirement 4.4)
              await db.syncLog.update(entry.id, {
                syncStatus: "conflict",
                syncError: result.reason ?? "conflict",
              });
            }
            // internal_error: leave as 'pending' — no update (Requirement 4.5)
          }
        }
      }

      // ── 2. Pull server changes ────────────────────────────────────────────
      setState("pulling");
      const cursorConfig = await db.appConfig.get("sync-cursor");
      let cursor = (cursorConfig?.value as string) ?? "0";

      let hasMore = true;
      while (hasMore) {
        let pullResult: Awaited<ReturnType<typeof adapter.pull>>;
        try {
          pullResult = await adapter.pull(tenantId, { _global: cursor });
        } catch (err) {
          if (err instanceof AuthError) {
            await db.appConfig.delete("sync-token");
            setState("error");
            toast.error("Sesi server berakhir. Silakan autentikasi ulang di halaman Pengaturan.");
            return;
          }
          // Any other pull error: preserve cursor, toast error (Requirement 5.7)
          toast.error("Gagal mengambil data dari server.");
          setState("error");
          setTimeout(() => setState("idle"), 5000);
          return;
        }

        // Apply pulled entities to local Dexie with conflict guard (Requirement 5.3)
        for (const { type, data } of pullResult.entities) {
          const tableName = type === "animal-types" ? "animalTypes" : type;
          // Dexie tables are indexed by string at runtime; safe cast required here
          // since the server is the source of truth for entity type names
          const table = (db as Record<string, Dexie.Table | undefined>)[tableName];
          if (!table) continue;

          for (const row of data) {
            const rowObj = row as Record<string, unknown> & { id: string };
            // Conflict guard: skip if local record is 'pending'
            const local = await table.get(rowObj.id);
            if (local && local.syncStatus === "pending") continue;
            await table.put({ ...rowObj, syncStatus: "synced" });
          }
        }

        // Update cursor after each page (Requirement 5.4)
        const newCursor = pullResult.cursors["_global"] ?? cursor;
        await db.appConfig.put({ key: "sync-cursor", value: newCursor });
        cursor = newCursor;

        hasMore = pullResult.hasMore;
      }

      // ── 3. Finalize ───────────────────────────────────────────────────────
      // Invalidate all queries to refresh UI (Requirement 5.6)
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
