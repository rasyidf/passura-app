import { useEffect } from "react";
import { Navigate } from "@tanstack/react-router";
import { useAuth } from "./session";
import { Spinner } from "@/components/ui/spinner";
import { db } from "@/db/local-db";

/**
 * Ensures a UUID v4 tenant-id exists in appConfig before any authenticated
 * route renders. If `appConfig["tenant-id"]` is absent, generates one via
 * `crypto.randomUUID()` and persists it.
 *
 * Requirements: 2.1, 2.2
 */
function useTenantInit() {
  useEffect(() => {
    (async () => {
      try {
        const existing = await db.appConfig.get("tenant-id");
        if (!existing?.value) {
          const tenantId = crypto.randomUUID();
          await db.appConfig.put({ key: "tenant-id", value: tenantId });
        }
      } catch {
        // Non-fatal: if Dexie is unavailable the app will still render;
        // the next mount attempt will retry.
      }
    })();
  }, []); // run once on mount — no cleanup needed
}

/**
 * Route guard that redirects to /login if not authenticated.
 * Also initialises the tenant-id in appConfig if not yet set.
 * Use as a wrapper in dashboard layout routes.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { elder, isLoading } = useAuth();

  // Initialise tenant-id before any authenticated route renders (Req 2.1, 2.2)
  useTenantInit();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (!elder) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}
