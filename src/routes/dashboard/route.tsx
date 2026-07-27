import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AuthGuard } from "@/auth/guard";
import { Sidebar } from "@/components/layout/Sidebar";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { SyncStatusBar } from "@/components/layout/SyncStatusBar";
import { KioskProvider } from "@/kiosk/KioskContext";
import { KioskOverlay } from "@/kiosk/KioskOverlay";
import { OnboardingGuard } from "@/onboarding/OnboardingGuard";
import { useSync } from "@/hooks/useSync";
import { useSyncScheduler } from "@/hooks/useSyncScheduler";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayoutInner,
  ssr: false, // Pure SPA — reads from Dexie, works offline
});

/**
 * Root layout for all /dashboard/* routes.
 *
 * Hierarchy:
 *   AuthGuard            — redirects to /login if not authenticated
 *   KioskProvider        — provides isActive / enter / exit via context
 *     OnboardingGuard    — overlays onboarding wizard (z-50) until complete
 *       div.flex         — sidebar + main content area
 *     KioskOverlay       — portal at z-60, covers everything when kiosk active
 *
 * Requirements: 1.3, 1.4, 5.5, 7.1
 */
function DashboardLayout() {
  return (
    <AuthGuard>
      <KioskProvider>
        <OnboardingGuard>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 md:ml-0 mt-14 md:mt-0 flex flex-col">
              {/* Breadcrumbs — rendered for every route except the dashboard root */}
              <div className="px-4 md:px-6 pt-4 md:pt-6 pb-0">
                <Breadcrumbs />
              </div>
              <Outlet />
              {/* SyncStatusBar — fixed footer showing sync state for all dashboard routes */}
              <SyncStatusBar />
            </main>
          </div>
        </OnboardingGuard>
        <KioskOverlay />
      </KioskProvider>
    </AuthGuard>
  );
}

/**
 * Inner layout that mounts the auto-sync scheduler.
 * Rendered inside AuthGuard so useSync/useSyncScheduler have access to auth context.
 * Kept as a separate component to isolate the hooks from the outer guard tree.
 */
function DashboardLayoutInner() {
  const { sync } = useSync();
  // Registers the 5-minute auto-sync interval for the full dashboard session (Requirement 7.1)
  useSyncScheduler(sync);
  return <DashboardLayout />;
}
