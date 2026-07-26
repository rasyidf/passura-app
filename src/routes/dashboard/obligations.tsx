import { createFileRoute } from "@tanstack/react-router";
import { useLocalQuery } from "@/hooks/useLocalQuery";
import type { Obligation } from "@/db/types";

export const Route = createFileRoute("/dashboard/obligations")({
  component: ObligationsPage,
});

function ObligationsPage() {
  const { data, isLoading } = useLocalQuery<Obligation>("obligations");
  const obligations = data?.docs ?? [];

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="flex-1 p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Kewajiban</h1>
        <p className="text-sm text-muted-foreground">
          Daftar kewajiban adat antar tongkonan.
        </p>
      </div>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Acara</th>
              <th className="px-4 py-3 text-left font-medium">Jenis</th>
              <th className="px-4 py-3 text-left font-medium">Tanggal</th>
              <th className="px-4 py-3 text-right font-medium">Nilai</th>
            </tr>
          </thead>
          <tbody>
            {obligations.map((o) => (
              <tr key={o.id} className="border-b">
                <td className="px-4 py-3 font-medium">{o.event}</td>
                <td className="px-4 py-3 text-muted-foreground">{o.paymentType}</td>
                <td className="px-4 py-3 text-muted-foreground">{o.date}</td>
                <td className="px-4 py-3 text-right font-mono text-orange-600">
                  Rp {(o.calculatedValue ?? 0).toLocaleString("id-ID")}
                </td>
              </tr>
            ))}
            {obligations.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  Belum ada data kewajiban.
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
