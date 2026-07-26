import { createFileRoute } from "@tanstack/react-router";
import { useLocalQuery } from "@/hooks/useLocalQuery";
import type { Group } from "@/db/types";

export const Route = createFileRoute("/dashboard/groups")({
  component: GroupsPage,
});

function GroupsPage() {
  const { data, isLoading } = useLocalQuery<Group>("groups");
  const groups = data?.docs ?? [];

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="flex-1 p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Grup</h1>
        <p className="text-sm text-muted-foreground">
          Kelompok acara untuk pencatatan.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((group) => (
          <div key={group.id} className="rounded-lg border p-4 space-y-2">
            <h3 className="font-semibold">{group.name}</h3>
            {group.eventName && (
              <p className="text-xs text-orange-600 font-medium">{group.eventName}</p>
            )}
            {group.description && (
              <p className="text-sm text-muted-foreground">{group.description}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {group.members.length} anggota
            </p>
          </div>
        ))}
        {groups.length === 0 && (
          <p className="text-muted-foreground text-sm col-span-2 text-center py-6">
            Belum ada grup.
          </p>
        )}
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
