import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Upload, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { db } from "@/db/local-db";
import {
  exportBackup,
  importBackup,
  applyImport,
  downloadJson,
} from "@/backup/backup-engine";
import type { BackupFile } from "@/backup/backup-types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import type { SettingsTabProps } from "./SettingsScreen";

// ─── State for the import flow ────────────────────────────────────────────────

type ImportStep =
  | { step: "idle" }
  | { step: "tenant-mismatch"; backup: BackupFile }
  | { step: "confirm"; backup: BackupFile }
  | { step: "importing"; backup: BackupFile };

// ─── BackupTab ─────────────────────────────────────────────────────────────────

function BackupTab({ isSuperadmin }: SettingsTabProps) {
  // Non-superadmins see nothing in this tab
  if (!isSuperadmin) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Hanya superadmin yang dapat mengakses fitur backup.
      </p>
    );
  }

  return <BackupTabContent />;
}

// Separate inner component so the hook rules are satisfied after the early return
function BackupTabContent() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [importStep, setImportStep] = useState<ImportStep>({ step: "idle" });
  const [importError, setImportError] = useState<string | null>(null);

  // Reactively read local tenant-id from appConfig
  const localTenantId = useLiveQuery(
    () => db.appConfig.get("tenant-id").then((cfg) => (cfg?.value as string) ?? ""),
    [],
    "",
  );

  // ── Export ──────────────────────────────────────────────────────────────────

  async function handleExport() {
    setIsExporting(true);
    try {
      const { backup, counts } = await exportBackup(localTenantId);
      downloadJson(backup);

      const summary = Object.entries(counts)
        .map(([table, n]) => `${table}: ${n}`)
        .join(", ");
      toast.success("Backup berhasil diekspor", { description: summary });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan saat ekspor.";
      toast.error("Ekspor gagal", { description: message });
    } finally {
      setIsExporting(false);
    }
  }

  // ── Import — file selected ──────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset the input so the same file can be re-selected after an error
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    setImportError(null);

    try {
      const { backup, tenantMismatch } = await importBackup(file, localTenantId);

      if (tenantMismatch) {
        // Show warning dialog first; confirm dialog comes after the user accepts
        setImportStep({ step: "tenant-mismatch", backup });
      } else {
        setImportStep({ step: "confirm", backup });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "File backup tidak valid.";
      setImportError(message);
    }
  }

  // ── Import — user accepted the tenant mismatch warning ─────────────────────

  function handleMismatchContinue() {
    if (importStep.step !== "tenant-mismatch") return;
    setImportStep({ step: "confirm", backup: importStep.backup });
  }

  // ── Import — user confirmed ─────────────────────────────────────────────────

  async function handleConfirmImport() {
    if (importStep.step !== "confirm") return;
    const backup = importStep.backup;

    setImportStep({ step: "importing", backup });
    try {
      const result = await applyImport(backup);

      if (result.success) {
        await qc.invalidateQueries();
        const summary = Object.entries(result.counts)
          .map(([table, n]) => `${table}: ${n}`)
          .join(", ");
        toast.success("Import berhasil", { description: summary });
        setImportStep({ step: "idle" });
      } else {
        toast.error("Import gagal", {
          description: result.failedTable
            ? `Gagal menulis ke tabel "${result.failedTable}": ${result.error}`
            : result.error,
        });
        setImportStep({ step: "idle" });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan saat import.";
      toast.error("Import gagal", { description: message });
      setImportStep({ step: "idle" });
    }
  }

  function handleCancelImport() {
    setImportStep({ step: "idle" });
  }

  // ── Derived helpers for the confirm dialog ──────────────────────────────────

  const confirmBackup =
    importStep.step === "confirm" || importStep.step === "importing"
      ? importStep.backup
      : null;

  const totalRecords = confirmBackup
    ? Object.values(confirmBackup.entities).reduce((sum, arr) => sum + arr.length, 0)
    : 0;

  const countSummary = confirmBackup
    ? Object.entries(confirmBackup.entities)
        .filter(([, arr]) => arr.length > 0)
        .map(([table, arr]) => `${table}: ${arr.length}`)
        .join(", ")
    : "";

  const isImporting = importStep.step === "importing";

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Export section ── */}
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-medium">Export Backup</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Unduh semua data lokal sebagai file JSON untuk disimpan sebagai cadangan.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={handleExport}
          disabled={isExporting}
          className="gap-2"
        >
          <Download className="size-4" />
          {isExporting ? "Mengekspor…" : "Export Backup"}
        </Button>
      </div>

      <div className="border-t" />

      {/* ── Import section ── */}
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-medium">Import Backup</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pulihkan data dari file backup JSON. Data yang ada akan digabung.
          </p>
        </div>

        {importError && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>File tidak valid</AlertTitle>
            <AlertDescription>{importError}</AlertDescription>
          </Alert>
        )}

        {/* Hidden file input; triggered by the visible button */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileChange}
          aria-label="Pilih file backup"
        />

        <Button
          variant="outline"
          onClick={() => {
            setImportError(null);
            fileInputRef.current?.click();
          }}
          className="gap-2"
        >
          <Upload className="size-4" />
          Import Backup
        </Button>
      </div>

      {/* ── Tenant mismatch warning dialog ── */}
      <Dialog
        open={importStep.step === "tenant-mismatch"}
        onOpenChange={(open) => { if (!open) handleCancelImport(); }}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              Peringatan: Tenant Berbeda
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 text-sm">
            <p>
              File backup ini berasal dari tenant yang berbeda dengan instalasi
              saat ini.
            </p>
            {importStep.step === "tenant-mismatch" && (
              <div className="rounded-md bg-muted px-3 py-2 text-xs font-mono space-y-1">
                <div>
                  <span className="text-muted-foreground">Tenant backup:</span>{" "}
                  {importStep.backup.tenantId || "(kosong)"}
                </div>
                <div>
                  <span className="text-muted-foreground">Tenant lokal:</span>{" "}
                  {localTenantId || "(belum diatur)"}
                </div>
              </div>
            )}
            <p className="text-muted-foreground">
              Melanjutkan akan mengimpor data dari tenant lain ke instalasi ini.
              Apakah Anda ingin melanjutkan?
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelImport}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleMismatchContinue}>
              Lanjutkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm import dialog ── */}
      <Dialog
        open={importStep.step === "confirm" || importStep.step === "importing"}
        onOpenChange={(open) => { if (!open && !isImporting) handleCancelImport(); }}
      >
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Konfirmasi Import</DialogTitle>
          </DialogHeader>

          {confirmBackup && (
            <div className="space-y-3 text-sm">
              <p>Tinjau detail backup sebelum mengimpor data:</p>

              <div className="rounded-md border bg-muted/40 px-3 py-3 space-y-2 text-xs">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Tenant ID</span>
                  <span className="font-mono truncate max-w-[220px]">
                    {confirmBackup.tenantId || "(kosong)"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Diekspor pada</span>
                  <span>
                    {new Date(confirmBackup.exportedAt).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Total data</span>
                  <span>{totalRecords} rekaman</span>
                </div>
              </div>

              {countSummary && (
                <p className="text-xs text-muted-foreground">{countSummary}</p>
              )}

              <Alert>
                <AlertTriangle className="size-4" />
                <AlertTitle>Perhatian</AlertTitle>
                <AlertDescription>
                  Semua rekaman dalam file backup akan ditulis ke database lokal
                  menggunakan <code>bulkPut</code>. Data yang sudah ada dengan ID
                  yang sama akan ditimpa.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelImport}
              disabled={isImporting}
            >
              Batal
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={isImporting}
            >
              {isImporting ? "Mengimpor…" : "Impor Sekarang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BackupTab;
