import { createFileRoute } from "@tanstack/react-router";
import { useLocalQuery } from "@/hooks/useLocalQuery";
import type { Participant } from "@/db/types";

export const Route = createFileRoute("/dashboard/participants")({
  component: ParticipantsPage,
});

function ParticipantsPage() {
  const { data, isLoading } = useLocalQuery<Participant>("participants");
  const participants = data?.docs ?? [];

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="flex-1 p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Silsilah / Peserta</h1>
        <p className="text-sm text-muted-foreground">
          Daftar individu dalam silsilah tongkonan.
        </p>
      </div>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Nama</th>
              <th className="px-4 py-3 text-left font-medium">Peran</th>
              <th className="px-4 py-3 text-left font-medium">Catatan</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    {p.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {p.notes ?? "-"}
                </td>
              </tr>
            ))}
            {participants.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                  Belum ada data silsilah.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PageLoader() {
  return (
    <div className="flex-1 p-6 flex items-center justify-center">
      <div className="size-6 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
    </div>
  );
}
