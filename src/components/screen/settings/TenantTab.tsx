import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { db } from "@/db/local-db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import type { SettingsTabProps } from "./SettingsScreen";

const API_URL_PATTERN = /^https?:\/\/.+/;

export default function TenantTab({ isSuperadmin }: SettingsTabProps) {
  // ── Reactive reads from appConfig ──────────────────────────────────────────
  const tenantIdConfig = useLiveQuery(
    () => db.appConfig.get("tenant-id"),
    []
  );
  const apiUrlConfig = useLiveQuery(
    () => db.appConfig.get("api-url"),
    []
  );

  const currentTenantId = (tenantIdConfig?.value as string | undefined) ?? "";
  const currentApiUrl =
    (apiUrlConfig?.value as string | undefined) ??
    (typeof (import.meta as any).env?.VITE_API_URL === "string"
      ? (import.meta as any).env.VITE_API_URL
      : "");

  // ── Tenant ID edit state ───────────────────────────────────────────────────
  const [tenantIdDraft, setTenantIdDraft] = useState("");
  const [tenantIdError, setTenantIdError] = useState("");
  const [savingTenantId, setSavingTenantId] = useState(false);

  // Keep draft in sync when the live value changes (e.g. on first load)
  useEffect(() => {
    setTenantIdDraft(currentTenantId);
  }, [currentTenantId]);

  async function handleSaveTenantId() {
    const trimmed = tenantIdDraft.trim();
    if (!trimmed) {
      setTenantIdError("Tenant ID tidak boleh kosong.");
      return;
    }
    setTenantIdError("");
    setSavingTenantId(true);
    try {
      await db.appConfig.put({ key: "tenant-id", value: trimmed });
      toast.success("Tenant ID berhasil disimpan.");
    } catch (err) {
      console.error("Failed to save tenant-id:", err);
      toast.error("Gagal menyimpan Tenant ID.");
      // Revert the draft so the field shows the unchanged persisted value
      setTenantIdDraft(currentTenantId);
    } finally {
      setSavingTenantId(false);
    }
  }

  // ── API URL edit state ─────────────────────────────────────────────────────
  const [apiUrlDraft, setApiUrlDraft] = useState("");
  const [apiUrlError, setApiUrlError] = useState("");
  const [savingApiUrl, setSavingApiUrl] = useState(false);

  // Keep draft in sync when the live value changes
  useEffect(() => {
    setApiUrlDraft(currentApiUrl);
  }, [currentApiUrl]);

  async function handleSaveApiUrl() {
    if (!API_URL_PATTERN.test(apiUrlDraft)) {
      setApiUrlError(
        "URL tidak valid. Harus dimulai dengan http:// atau https://."
      );
      return;
    }
    setApiUrlError("");
    setSavingApiUrl(true);
    try {
      await db.appConfig.put({ key: "api-url", value: apiUrlDraft });
      toast.success("URL API berhasil disimpan.");
    } catch (err) {
      console.error("Failed to save api-url:", err);
      toast.error("Gagal menyimpan URL API.");
      // Revert the draft
      setApiUrlDraft(currentApiUrl);
    } finally {
      setSavingApiUrl(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Tenant ID card ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tenant ID</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Read-only display (all roles) */}
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">
              ID Tenant Saat Ini
            </Label>
            <Input
              value={currentTenantId}
              readOnly
              disabled
              className="font-mono text-sm bg-muted"
            />
          </div>

          {/* Editable override (superadmin only) */}
          {isSuperadmin && (
            <div className="space-y-1.5">
              <Label htmlFor="tenant-id-input">
                Ubah Tenant ID
              </Label>
              <div className="flex gap-2">
                <Input
                  id="tenant-id-input"
                  value={tenantIdDraft}
                  onChange={(e) => {
                    setTenantIdDraft(e.target.value);
                    if (tenantIdError) setTenantIdError("");
                  }}
                  placeholder="Masukkan Tenant ID baru"
                  className="font-mono text-sm flex-1"
                />
                <Button
                  onClick={handleSaveTenantId}
                  disabled={savingTenantId}
                  className="shrink-0"
                >
                  {savingTenantId ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
              {tenantIdError && (
                <p className="text-sm text-destructive">{tenantIdError}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── API URL card ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">URL Server API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Read-only display (all roles) */}
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">
              URL API Saat Ini
            </Label>
            <Input
              value={currentApiUrl}
              readOnly
              disabled
              className="font-mono text-sm bg-muted"
            />
          </div>

          {/* Editable override (superadmin only) */}
          {isSuperadmin && (
            <div className="space-y-1.5">
              <Label htmlFor="api-url-input">
                Ubah URL API
              </Label>
              <div className="flex gap-2">
                <Input
                  id="api-url-input"
                  value={apiUrlDraft}
                  onChange={(e) => {
                    setApiUrlDraft(e.target.value);
                    if (apiUrlError) setApiUrlError("");
                  }}
                  placeholder="https://api.example.com"
                  className="font-mono text-sm flex-1"
                />
                <Button
                  onClick={handleSaveApiUrl}
                  disabled={savingApiUrl}
                  className="shrink-0"
                >
                  {savingApiUrl ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
              {apiUrlError && (
                <p className="text-sm text-destructive">{apiUrlError}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
