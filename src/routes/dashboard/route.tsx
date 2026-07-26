import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AuthGuard } from "@/auth/guard";
import { Sidebar } from "@/components/layout/Sidebar";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
  ssr: false, // Pure SPA — reads from Dexie, works offline
});

function DashboardLayout() {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 md:ml-0 mt-14 md:mt-0">
          <Outlet />
        </main>
      </div>
    </AuthGuard>
  );
}
