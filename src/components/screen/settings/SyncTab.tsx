import { useState, FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { LogIn, LogOut, RefreshCw, CheckCircle2, XCircle } from "lucide-react";

import { db } from "@/db/local-db";
import { CloudflareD1Adapter } from "@/sync/adapters/cloudflare-d1";
import { useSync } from "@/hooks/useSync";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";

import type { SettingsTabProps } from "./SettingsScreen";

// ── JWT decoding helper (no library) ─────────────────────────────────────────

interface JwtPayload {
  exp?: number;
  [key: string]: unknown;
}

/**
 * Manually decodes the JWT payload (second segment).
 * Returns `null` if the token is not a valid JWT or cannot be parsed.
 */
function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // base64url → base64 → decode
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    // Pad to a multiple of 4
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const jsonStr = atob(padded);
    return JSON.parse(jsonStr) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Returns auth status derived from the raw token string.
 *   - `{ authenticated: true, expiry: Date }` when the token is a valid,
 *     non-expired JWT.
 *   - `{ authenticated: false }` otherwise (absent, expired, or malformed).
 */
function getTokenStatus(token: string | undefined | null):
  | { authenticated: true; expiry: Date }
  | { authenticated: false } {
  if (!token) return { authenticated: false };

  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return { authenticated: false };

  const expiry = new Date(payload.exp * 1000);
  if (expiry <= new Date()) return { authenticated: false };

  return { authenticated: true, expiry };
}

// ── Singleton adapter (same pattern as useSync) ───────────────────────────────
const adapter = new CloudflareD1Adapter();

// ── Component ─────────────────────────────────────────────────────────────────

function SyncTab({ isSuperadmin }: SettingsTabProps) {
  const { sync, state: syncState } = useSync();

  // Reactive reads from appConfig
  const syncToken = useLiveQuery(
    () => db.appConfig.get("sync-token").then((r) => r?.value as string | undefined),
    [],
  );
  const autoSyncEnabled = useLiveQuery(
    () => db.appConfig.get("auto-sync-enabled").then((r) => r?.value as boolean | undefined),
    [],
  );

  // Auth form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Derive token status (recalculates every render as syncToken changes)
  const tokenStatus = getTokenStatus(syncToken);

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleAuthenticate(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setAuthLoading(true);
    try {
      const result = await adapter.authenticate({ email: email.trim(), password });

      if (result.success && result.token) {
        // Token already stored inside adapter.authenticate() → appConfig["sync-token"]
        toast.success("Berhasil login ke server.");
      } else {
        // Parseable API error (Requirement 6.3)
        const msg = result.error ?? "Login gagal.";
        toast.error(msg);
      }
    } catch {
      // Network error or unparseable response (Requirement 6.7)
      toast.error("Gagal menghubungi server. Periksa koneksi jaringan Anda.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    // Requirement 6.4: delete sync-token → status becomes "Not authenticated"
    await db.appConfig.delete("sync-token");
    toast.success("Berhasil keluar dari server.");
  }

  async function handleAutoSyncToggle(checked: boolean) {
    // Requirement 7.5 / 7.6: persist preference to appConfig
    await db.appConfig.put({ key: "auto-sync-enabled", value: checked });
    toast.success(checked ? "Auto-sync diaktifkan." : "Auto-sync dinonaktifkan.");
  }

  async function handleSyncNow() {
    await sync();
  }

  const isSyncing = syncState === "pushing" || syncState === "pulling";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Authentication Status ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status Autentikasi</CardTitle>
        </CardHeader>
        <CardContent>
          {tokenStatus.authenticated ? (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>
                Terautentikasi — berlaku hingga{" "}
                <span className="font-medium">
                  {tokenStatus.expiry.toLocaleString("id-ID", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <XCircle className="size-4 shrink-0" />
              <span>Belum terautentikasi</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Auth Form + Sign Out (superadmin only) ────────────── */}
      {isSuperadmin && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Login ke Server</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAuthenticate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sync-email">Email</Label>
                  <Input
                    id="sync-email"
                    type="email"
                    autoComplete="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={authLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sync-password">Password</Label>
                  <Input
                    id="sync-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={authLoading}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={authLoading || !email.trim() || !password}
                  className="gap-2"
                >
                  {authLoading ? (
                    <Spinner className="size-4" />
                  ) : (
                    <LogIn className="size-4" />
                  )}
                  Autentikasi
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Sign Out */}
          {tokenStatus.authenticated && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-muted-foreground">
                    Hapus token sinkronisasi dari perangkat ini.
                  </p>
                  <Button
                    variant="outline"
                    onClick={handleSignOut}
                    className="gap-2 shrink-0"
                  >
                    <LogOut className="size-4" />
                    Keluar dari Server
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Auto-sync Toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Auto-Sinkronisasi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Sinkronisasi otomatis setiap 5 menit
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Membutuhkan koneksi internet dan token autentikasi yang aktif.
                  </p>
                </div>
                <Switch
                  id="auto-sync-toggle"
                  checked={autoSyncEnabled === true}
                  onCheckedChange={handleAutoSyncToggle}
                  aria-label="Toggle auto-sync"
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Sync Now (all roles) ──────────────────────────────── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Sinkronkan data lokal dengan server sekarang.
            </p>
            <Button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="gap-2 shrink-0"
            >
              {isSyncing ? (
                <Spinner className="size-4" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Sinkronisasi Sekarang
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

export default SyncTab;
