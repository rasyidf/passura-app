import { createFileRoute } from "@tanstack/react-router";
import { HardDrive } from "lucide-react";

export const Route = createFileRoute("/dashboard/backup")({
  component: BackupPage,
  ssr: false,
});

function BackupPage() {
  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <HardDrive className="size-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Backup</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Unduh dan kelola backup data aplikasi Anda.
          </p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Halaman ini sedang dalam pengembangan. Untuk sementara, gunakan menu{" "}
        <strong>Pengaturan → Backup &amp; Restore</strong>.
      </p>
    </div>
  );
}
