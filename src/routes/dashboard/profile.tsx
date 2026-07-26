import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/auth/session";
import { db } from "@/db/local-db";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { elder } = useAuth();

  const handleExport = async () => {
    try {
      const data = {
        exportedAt: new Date().toISOString(),
        clans: await db.clans.toArray(),
        elders: await db.elders.toArray(),
        participants: await db.participants.toArray(),
        groups: await db.groups.toArray(),
        animalTypes: await db.animalTypes.toArray(),
        loans: await db.loans.toArray(),
        receipts: await db.receipts.toArray(),
        handovers: await db.handovers.toArray(),
        obligations: await db.obligations.toArray(),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `passura-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup berhasil diunduh!");
    } catch (err) {
      toast.error("Gagal mengekspor data.");
      console.error(err);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Profil & Backup</h1>
        <p className="text-sm text-muted-foreground">
          Informasi akun dan cadangan data.
        </p>
      </div>

      {/* Profile card */}
      <div className="rounded-lg border p-6 space-y-4 max-w-md">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-full bg-orange-500 text-white grid place-items-center font-bold text-lg">
            {elder?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div>
            <p className="font-semibold">{elder?.name ?? "Pengguna"}</p>
            <p className="text-sm text-muted-foreground">{elder?.email ?? "-"}</p>
          </div>
        </div>
        <div className="text-sm space-y-1">
          <p>
            <span className="text-muted-foreground">Peran:</span>{" "}
            <span className="capitalize">{elder?.role ?? "-"}</span>
          </p>
        </div>
      </div>

      {/* Backup */}
      <div className="rounded-lg border p-6 space-y-4 max-w-md">
        <h2 className="font-semibold">Cadangan Data</h2>
        <p className="text-sm text-muted-foreground">
          Unduh semua data sebagai file JSON. Berguna untuk backup jika browser
          menghapus IndexedDB.
        </p>
        <button
          onClick={handleExport}
          className="inline-flex items-center justify-center rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors"
        >
          Unduh Backup (.json)
        </button>
      </div>
    </div>
  );
}
