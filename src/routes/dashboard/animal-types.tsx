import { createFileRoute } from "@tanstack/react-router";
import { useLocalQuery } from "@/hooks/useLocalQuery";
import type { AnimalType } from "@/db/types";

export const Route = createFileRoute("/dashboard/animal-types")({
  component: AnimalTypesPage,
});

function AnimalTypesPage() {
  const { data, isLoading } = useLocalQuery<AnimalType>("animal-types");
  const animalTypes = data?.docs ?? [];

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="flex-1 p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Jenis Hewan</h1>
        <p className="text-sm text-muted-foreground">
          Daftar jenis hewan adat dan harga acuannya.
        </p>
      </div>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Nama</th>
              <th className="px-4 py-3 text-left font-medium">Kategori</th>
              <th className="px-4 py-3 text-left font-medium">Ras</th>
              <th className="px-4 py-3 text-left font-medium">Kualitas</th>
              <th className="px-4 py-3 text-right font-medium">Harga</th>
            </tr>
          </thead>
          <tbody>
            {animalTypes.map((at) => (
              <tr key={at.id} className="border-b">
                <td className="px-4 py-3 font-medium">{at.name}</td>
                <td className="px-4 py-3 text-muted-foreground capitalize">
                  {at.category}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{at.breed}</td>
                <td className="px-4 py-3">
                  <QualityBadge quality={at.quality} />
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  Rp {at.price.toLocaleString("id-ID")}
                </td>
              </tr>
            ))}
            {animalTypes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Belum ada data jenis hewan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QualityBadge({ quality }: { quality: string }) {
  const colors: Record<string, string> = {
    unique: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
    high: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
    medium: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[quality] ?? ""}`}>
      {quality}
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
