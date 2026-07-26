import { useEffect } from "react";
import { useSync } from "@/hooks/useSync";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, AlertTriangle, Wifi, WifiOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function SyncStatusBar() {
  const { state, pendingCount, lastSyncAt, sync, countPending } = useSync();

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

      {state === "success" && lastSyncAt && (
        <span className="flex items-center gap-1 text-green-600">
          <CheckCircle2 className="size-3" />
          {lastSyncAt.toLocaleTimeString("id-ID")}
        </span>
      )}

      {(state === "pushing" || state === "pulling") && (
        <span className="flex items-center gap-1">
          <Loader2 className="size-3 animate-spin" />
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
