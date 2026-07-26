import { createFileRoute } from "@tanstack/react-router";
import { useLocalQuery } from "@/hooks/useLocalQuery";
import type { Receipt } from "@/db/types";

export const Route = createFileRoute("/dashboard/receipts")({
  component: ReceiptsPage,
});

function ReceiptsPage() {
  const { data, isLoading } = useLocalQuery<Receipt>("receipts");
  const receipts = data?.docs ?? [];

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="flex-1 p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Penerimaan</h1>
        <p className="text-sm text-muted-foreground">
          Daftar donasi/sumbangan yang diterima.
        </p>
      </div>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Jenis</th>
              <th className="px-4 py-3 text-left font-medium">Aset</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Nilai</th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((receipt) => (
              <tr key={receipt.id} className="border-b">
                <td className="px-4 py-3 font-medium">{receipt.obligationType}</td>
                <td className="px-4 py-3 text-muted-foreground">{receipt.assetType}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                    {receipt.settlementStatus}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-green-600">
                  Rp {(receipt.calculatedValue ?? 0).toLocaleString("id-ID")}
                </td>
              </tr>
            ))}
            {receipts.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  Belum ada data penerimaan.
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
