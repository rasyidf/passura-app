import { createFileRoute } from "@tanstack/react-router";
import { useLocalQuery } from "@/hooks/useLocalQuery";
import type { Clan } from "@/db/types";

export const Route = createFileRoute("/dashboard/clans")({
  component: ClansPage,
});

function ClansPage() {
  const { data, isLoading } = useLocalQuery<Clan>("clans");
  const clans = data?.docs ?? [];

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="flex-1 p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Clan / Tongkonan</h1>
        <p className="text-sm text-muted-foreground">
          Daftar rumah tangga adat terdaftar.
        </p>
      </div>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Nama</th>
              <th className="px-4 py-3 text-left font-medium">Wilayah</th>
            </tr>
          </thead>
          <tbody>
            {clans.map((clan) => (
              <tr key={clan.id} className="border-b">
                <td className="px-4 py-3 font-medium">{clan.name}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {clan.region ?? "-"}
                </td>
              </tr>
            ))}
            {clans.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">
                  Belum ada data clan.
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
