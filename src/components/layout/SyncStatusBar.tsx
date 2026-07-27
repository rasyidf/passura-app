import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useSync } from "@/hooks/useSync";
import { db } from "@/db/local-db";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, AlertTriangle, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

export function SyncStatusBar() {
  const { state, pendingCount, lastSyncAt, sync, countPending } = useSync();

  // Reactively query conflict count from syncLog (Requirement 8.1)
  const conflictCount = useLiveQuery(
    () => db.syncLog.where("syncStatus").equals("conflict").count(),
    [],
    0
  ) ?? 0;

  // Reactively read auto-sync preference from appConfig (Requirement 7.7)
  const autoSyncEnabled = useLiveQuery(
    () => db.appConfig.get("auto-sync-enabled").then((cfg) => cfg?.value as boolean | undefined),
    [],
    undefined
  );

  // Count pending on mount and whenever visibility changes
  useEffect(() => {
    countPending();
    const handleFocus = () => countPending();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [countPending]);

  const isOnline = typeof navigator !== "undefined" && navigator.onLine;

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t text-xs text-muted-foreground">
      {/* Online indicator */}
      <span className={cn("flex items-center gap-1", isOnline ? "text-green-600" : "text-red-500")}>
        {isOnline ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
        <span className="hidden sm:inline">{isOnline ? "Online" : "Offline"}</span>
      </span>

      {/* Pending count */}
      {pendingCount > 0 && (
        <span className="flex items-center gap-1 text-orange-600">
          <AlertTriangle className="size-3" />
          {pendingCount} belum disinkronkan
        </span>
      )}

      {/* Conflict count badge — shown when conflicts exist (Requirement 8.1) */}
      {conflictCount > 0 && (
        <span className="flex items-center gap-1 text-red-600">
          <AlertTriangle className="size-3" />
          {conflictCount} konflik
        </span>
      )}

      {/* Auto-sync off indicator — shown when explicitly disabled (Requirement 7.7) */}
      {autoSyncEnabled === false && (
        <span className="flex items-center gap-1 text-muted-foreground/70">
          Auto-sync off
        </span>
      )}

      {state === "success" && lastSyncAt && (
        <span className="flex items-center gap-1 text-green-600">
          <CheckCircle2 className="size-3" />
          {lastSyncAt.toLocaleTimeString("id-ID")}
        </span>
      )}

      {(state === "pushing" || state === "pulling") && (
        <span className="flex items-center gap-1">
          <Spinner className="size-3" />
          {state === "pushing" ? "Mengirim..." : "Mengambil..."}
        </span>
      )}

      {/* Sync button */}
      <Button
        size="sm"
        variant="ghost"
        onClick={sync}
        disabled={state === "pushing" || state === "pulling"}
        className="ml-auto h-6 gap-1 px-2 text-xs"
        title="Sinkronisasi sekarang"
      >
        <RefreshCw className={cn("size-3", (state === "pushing" || state === "pulling") && "animate-spin")} />
        Sinkronisasi
      </Button>
    </div>
  );
}
