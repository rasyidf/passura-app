import { useState, useEffect, useCallback, useRef } from "react";
import { db } from "@/db/local-db";
import type { KioskDraftBase, KioskDraftKey } from "./KioskDraft";

/**
 * Return type of the `useKioskDraft` hook.
 *
 * Validates: Design — useKioskDraft hook return interface
 * Requirements: 5.6, 5.7, 10.1
 */
export interface UseKioskDraftReturn<D extends KioskDraftBase> {
  draft: D | null;
  updateDraft: (patch: Partial<D>) => Promise<void>;
  clearDraft: () => Promise<void>;
  isLoading: boolean;
}

/**
 * Generic hook for reading and persisting a single Kiosk Flow draft to
 * `db.appConfig`.
 *
 * - Loads the existing draft from IndexedDB on mount.
 * - `updateDraft(patch)` merges `patch` into the current draft and writes to
 *   IndexedDB BEFORE the returned promise resolves (Property 9 guarantee).
 * - `clearDraft()` deletes the draft key from `db.appConfig`.
 *
 * Type parameter `D` must extend `KioskDraftBase` so that `currentStep` and
 * `flowType` are always present.
 *
 * Validates: Requirements 5.6, 5.7 (Property 9)
 */
export function useKioskDraft<D extends KioskDraftBase>(
  draftKey: KioskDraftKey
): UseKioskDraftReturn<D> {
  const [draft, setDraft] = useState<D | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Serialization queue — prevents concurrent writes from interleaving.
  const writeQueue = useRef<Promise<void>>(Promise.resolve());

  // ── Load on mount ──────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const record = await db.appConfig.get(draftKey);
        if (cancelled) return;
        setDraft(record ? (record.value as D) : null);
      } catch {
        // IDB unavailable — treat as empty
        if (!cancelled) setDraft(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    setIsLoading(true);
    load();

    return () => {
      cancelled = true;
    };
  }, [draftKey]);

  // ── updateDraft ────────────────────────────────────────────────────────────

  /**
   * Merges `patch` into the current draft and writes to IndexedDB before
   * resolving. React state is updated only after the write succeeds.
   *
   * Validates: Property 9 — draft persisted after every step advance.
   */
  const updateDraft = useCallback(
    (patch: Partial<D>): Promise<void> => {
      const next = writeQueue.current.then(async () => {
        // Read the freshest copy from IndexedDB to avoid lost-update races.
        const record = await db.appConfig.get(draftKey);
        const current = record ? (record.value as D) : ({} as D);
        const updated: D = { ...current, ...patch };

        // Write BEFORE updating React state (Property 9 guarantee).
        await db.appConfig.put({ key: draftKey, value: updated });

        setDraft(updated);
      });

      writeQueue.current = next.catch(() => {
        // Reset queue on error so subsequent writes are not blocked.
      });

      return next;
    },
    [draftKey]
  );

  // ── clearDraft ─────────────────────────────────────────────────────────────

  /**
   * Deletes the draft key from `db.appConfig` and resets local state to null.
   *
   * Validates: Requirement 5.6 — discard deletes the draft from IndexedDB.
   */
  const clearDraft = useCallback(async (): Promise<void> => {
    const next = writeQueue.current.then(async () => {
      await db.appConfig.delete(draftKey);
      setDraft(null);
    });

    writeQueue.current = next.catch(() => {});

    return next;
  }, [draftKey]);

  return { draft, updateDraft, clearDraft, isLoading };
}
