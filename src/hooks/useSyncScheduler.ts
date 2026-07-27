import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/local-db";

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Schedules automatic sync every 5 minutes when all conditions are met:
 *   - navigator.onLine === true
 *   - appConfig["sync-token"] is present (non-empty string)
 *   - appConfig["auto-sync-enabled"] === true
 *
 * The first fire occurs 5 minutes after mount or after re-enable — never
 * immediately on enable (Requirements 7.1, 7.4, 7.8).
 * Clears the interval on unmount (Requirement 7.5).
 */
export function useSyncScheduler(sync: () => Promise<void>): void {
  // Reactively read auto-sync-enabled and sync-token from appConfig.
  // useLiveQuery re-evaluates whenever the queried Dexie rows change.
  const autoSyncEnabled = useLiveQuery(async () => {
    const cfg = await db.appConfig.get("auto-sync-enabled");
    return cfg?.value === true;
  }, []);

  const tokenPresent = useLiveQuery(async () => {
    const cfg = await db.appConfig.get("sync-token");
    return typeof cfg?.value === "string" && cfg.value.length > 0;
  }, []);

  useEffect(() => {
    // useLiveQuery returns undefined on the first render (loading state).
    // Wait until both values are resolved before deciding whether to schedule.
    if (autoSyncEnabled === undefined || tokenPresent === undefined) {
      return;
    }

    const shouldSchedule = navigator.onLine && tokenPresent && autoSyncEnabled;

    if (!shouldSchedule) {
      // Conditions not met — no interval to set up; nothing to clean up.
      return;
    }

    // Schedule the interval. The first tick fires after the full interval
    // period (5 minutes), satisfying the "never immediately on enable" rule.
    const id = setInterval(() => {
      // Re-check online status at fire time in case it changed (Requirement 7.4)
      if (navigator.onLine) {
        sync().catch(() => {
          // Errors are surfaced inside sync() itself via toast notifications.
          // useSyncScheduler intentionally does not swallow or re-throw here.
        });
      }
    }, SYNC_INTERVAL_MS);

    // Cleanup: clear the interval when the component unmounts or when any
    // dependency changes (which will re-run this effect with new values).
    return () => clearInterval(id);
  }, [autoSyncEnabled, tokenPresent, sync]);
}
