import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/auth/session";
import { seedIfEmpty } from "@/db/seed";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  ssr: false, // Client-only — reads from IndexedDB
});

function LoginPage() {
  const { login, elder, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
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
    setError("");
    setLoading(true);

    const success = await login(email, password);
    if (success) {
      navigate({ to: "/dashboard" });
    } else {
      setError("Email atau kata sandi salah.");
    }
    setLoading(false);
  };

  if (authLoading || seeding) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="size-8 animate-spin text-orange-600 mx-auto" />
          <p className="text-sm text-muted-foreground">
            {seeding ? "Menyiapkan data demo..." : "Memuat..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="size-12 rounded-xl bg-orange-500 text-white grid place-items-center font-bold text-lg mx-auto">
            P
          </div>
          <h1 className="text-2xl font-semibold">Masuk ke Passura</h1>
          <p className="text-sm text-muted-foreground">
            Gunakan email dan kata sandi elder Anda.
          </p>
        </div>

        {/* Form */}
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
              placeholder="rante-ne-tato-dena@passura.local"
              required
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
              required
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center rounded-md bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : null}
            Masuk
          </button>
        </form>

        {/* Demo credentials hint */}
        <div className="rounded-md border bg-muted/50 p-3 space-y-1">
          <p className="text-xs font-medium">Demo login:</p>
          <p className="text-xs text-muted-foreground font-mono">
            rante-ne-tato-dena@passura.local
          </p>
          <p className="text-xs text-muted-foreground font-mono">elder123</p>
        </div>
      </div>
    </div>
  );
}
