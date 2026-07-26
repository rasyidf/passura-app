import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AuthGuard } from "@/auth/guard";
import { Sidebar } from "@/components/layout/Sidebar";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { KioskProvider } from "@/kiosk/KioskContext";
import { KioskOverlay } from "@/kiosk/KioskOverlay";
import { OnboardingGuard } from "@/onboarding/OnboardingGuard";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
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
 * Requirements: 1.3, 1.4, 5.5
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
            </main>
          </div>
        </OnboardingGuard>
        <KioskOverlay />
      </KioskProvider>
    </AuthGuard>
  );
}
