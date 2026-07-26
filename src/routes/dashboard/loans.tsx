import { createFileRoute } from "@tanstack/react-router";
import { useLocalQuery } from "@/hooks/useLocalQuery";
import type { Loan } from "@/db/types";

export const Route = createFileRoute("/dashboard/loans")({
  component: LoansPage,
});

function LoansPage() {
  const { data, isLoading } = useLocalQuery<Loan>("loans");
  const loans = data?.docs ?? [];

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="flex-1 p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Utang Piutang</h1>
        <p className="text-sm text-muted-foreground">
          Daftar pinjaman antar tongkonan.
        </p>
      </div>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Acara</th>
              <th className="px-4 py-3 text-left font-medium">Jenis</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Sisa</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((loan) => (
              <tr key={loan.id} className="border-b">
                <td className="px-4 py-3 font-medium">{loan.event}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {loan.loanType}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={loan.status} />
                </td>
                <td className="px-4 py-3 text-right font-mono text-orange-600">
                  Rp {(loan.remainingValue ?? 0).toLocaleString("id-ID")}
                </td>
              </tr>
            ))}
            {loans.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  Belum ada data pinjaman.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    approved: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
    settled: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    requested: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
    defaulted: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    canceled: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? ""}`}>
      {status}
    </span>
  );
}

function PageLoader() {
  return (
    <div className="flex-1 p-6 flex items-center justify-center">
      <div className="size-6 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
    </div>
  );
}
