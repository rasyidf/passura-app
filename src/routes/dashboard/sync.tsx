import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";

export const Route = createFileRoute("/dashboard/sync")({
  component: SyncPage,
  ssr: false,
});

function SyncPage() {
  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <RefreshCw className="size-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sinkronisasi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola sinkronisasi data antara perangkat dan server.
          </p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Halaman ini sedang dalam pengembangan.
      </p>
    </div>
  );
}
