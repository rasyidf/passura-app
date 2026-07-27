import { lazy, Suspense } from "react";
import { useAuth } from "@/auth/session";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";

// Fallback component used when a lazy tab chunk fails to load
function NullTab(_props: SettingsTabProps) {
  return <></>;
}

// ── Lazy-loaded tab components ────────────────────────────────────────────────
const TenantTab = lazy(
  () => import("./TenantTab").catch(() => ({ default: NullTab }))
);
const SyncTab = lazy(
  () => import("./SyncTab").catch(() => ({ default: NullTab }))
);
const BackupTab = lazy(
  () => import("./BackupTab").catch(() => ({ default: NullTab }))
);
const ConflictsTab = lazy(
  () => import("./ConflictsTab").catch(() => ({ default: NullTab }))
);
const DangerZoneTab = lazy(
  () => import("./DangerZoneTab").catch(() => ({ default: NullTab }))
);

// ── Shared props passed down to every tab ─────────────────────────────────────
export interface SettingsTabProps {
  isSuperadmin: boolean;
}

// ── Tab fallback while the lazy chunk loads ───────────────────────────────────
function TabLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <Spinner className="size-5 text-muted-foreground" />
    </div>
  );
}

// ── Main shell ────────────────────────────────────────────────────────────────
export function SettingsScreen() {
  const { elder } = useAuth();
  const isSuperadmin = elder?.role === "superadmin";

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-xl font-semibold">Pengaturan</h1>
          <p className="text-sm text-muted-foreground">
            Konfigurasi tenant, sinkronisasi, backup, dan manajemen data.
          </p>
        </div>

        {/* Five-tab layout */}
        <Tabs defaultValue="tenant">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="tenant">Tenant</TabsTrigger>
            <TabsTrigger value="sync">Sinkronisasi</TabsTrigger>
            <TabsTrigger value="backup">Backup</TabsTrigger>
            <TabsTrigger value="conflicts">Konflik</TabsTrigger>
            <TabsTrigger value="danger">Zona Bahaya</TabsTrigger>
          </TabsList>

          <TabsContent value="tenant" className="mt-4">
            <Suspense fallback={<TabLoader />}>
              <TenantTab isSuperadmin={isSuperadmin} />
            </Suspense>
          </TabsContent>

          <TabsContent value="sync" className="mt-4">
            <Suspense fallback={<TabLoader />}>
              <SyncTab isSuperadmin={isSuperadmin} />
            </Suspense>
          </TabsContent>

          <TabsContent value="backup" className="mt-4">
            <Suspense fallback={<TabLoader />}>
              <BackupTab isSuperadmin={isSuperadmin} />
            </Suspense>
          </TabsContent>

          <TabsContent value="conflicts" className="mt-4">
            <Suspense fallback={<TabLoader />}>
              <ConflictsTab isSuperadmin={isSuperadmin} />
            </Suspense>
          </TabsContent>

          <TabsContent value="danger" className="mt-4">
            <Suspense fallback={<TabLoader />}>
              <DangerZoneTab isSuperadmin={isSuperadmin} />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default SettingsScreen;
