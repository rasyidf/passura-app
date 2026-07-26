import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/auth/session";
import { seedIfEmpty } from "@/db/seed";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  ssr: false, // Client-only — reads from IndexedDB
});

function LoginPage() {
  const { login, elder, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (elder) {
      navigate({ to: "/dashboard" });
    }
  }, [elder, navigate]);

  // Seed demo data on first visit
  useEffect(() => {
    (async () => {
      setSeeding(true);
      await seedIfEmpty();
      setSeeding(false);
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const success = await login(email, password);
    if (success) {
      toast.success("Berhasil masuk");
      navigate({ to: "/dashboard" });
    } else {
      toast.error("Email atau kata sandi salah");
    }
    setLoading(false);
  };

  if (authLoading || seeding) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="size-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">
            {seeding ? "Menyiapkan data demo..." : "Memuat..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left pane — image (hidden on mobile) */}
      <div className="hidden md:block md:w-1/2 relative">
        <img
          src="/images/toraja-rambu-solo.png"
          alt="Toraja"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>

      {/* Right pane — login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Masuk ke Passura</h1>
            <p className="text-sm text-muted-foreground">
              Gunakan akun admin atau tetua (elder) Anda.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@passura.local"
                required
                autoComplete="username"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Kata Sandi
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Demo:{" "}
            <code className="bg-muted px-1 rounded">admin@passura.local</code> /{" "}
            <code className="bg-muted px-1 rounded">passura123</code>
          </p>
          <button
            type="button"
            onClick={async () => {
              const { db } = await import("@/db/local-db");
              await db.delete();
              window.location.reload();
            }}
            className="w-full text-center text-xs text-muted-foreground underline hover:text-foreground transition-colors"
          >
            Reset data demo (hapus semua data lokal)
          </button>
        </div>
      </div>
    </div>
  );
}
