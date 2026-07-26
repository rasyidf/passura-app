import { Navigate } from "@tanstack/react-router";
import { useAuth } from "./session";
import { Loader2 } from "lucide-react";

/**
 * Route guard that redirects to /login if not authenticated.
 * Use as a wrapper in dashboard layout routes.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { elder, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!elder) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}
