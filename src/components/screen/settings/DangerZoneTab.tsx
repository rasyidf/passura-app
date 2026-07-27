import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { db } from "@/db/local-db";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SettingsTabProps } from "./SettingsScreen";

// Typed table map — avoids casting db to `any`
const TABLE_MAP = {
  clans:       db.clans,
  elders:      db.elders,
  participants: db.participants,
  groups:      db.groups,
  animalTypes: db.animalTypes,
  loans:       db.loans,
  receipts:    db.receipts,
  handovers:   db.handovers,
  obligations: db.obligations,
  syncLog:     db.syncLog,
  appConfig:   db.appConfig,
} as const;

type ClearableTable = keyof typeof TABLE_MAP;

// Tables cleared in the order specified by the task
const TABLES_TO_CLEAR: ClearableTable[] = [
  "clans", "elders", "participants", "groups", "animalTypes",
  "loans", "receipts", "handovers", "obligations", "syncLog", "appConfig",
];

const CONFIRMATION_WORD = "RESET";

// ── DangerZoneTab ─────────────────────────────────────────────────────────────

function DangerZoneTab({ isSuperadmin }: SettingsTabProps) {
  // Non-superadmins see nothing in this tab
  if (!isSuperadmin) {
    return null;
  }

  return <DangerZoneTabContent />;
}

// Inner component so hook rules are satisfied after the early return above
function DangerZoneTabContent() {
  const navigate = useNavigate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const isConfirmed = confirmText === CONFIRMATION_WORD;

  function handleOpenDialog() {
    setConfirmText("");
    setDialogOpen(true);
  }

  function handleCloseDialog() {
    if (isResetting) return; // prevent closing mid-reset
    setDialogOpen(false);
    setConfirmText("");
  }

  async function handleReset() {
    if (!isConfirmed || isResetting) return;

    setIsResetting(true);

    for (const tableName of TABLES_TO_CLEAR) {
      try {
        await TABLE_MAP[tableName].clear();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Terjadi kesalahan.";
        toast.error(`Gagal menghapus tabel "${tableName}": ${message}`);
        setIsResetting(false);
        return; // leave remaining tables intact (Requirement 12.5)
      }
    }

    // All tables cleared — navigate and notify (Requirement 12.4)
    toast.success("Semua data lokal telah dihapus.");
    await navigate({ to: "/login" });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="size-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <h2 className="text-sm font-semibold text-destructive">
              Zona Bahaya
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Tindakan di bawah ini bersifat permanen dan tidak dapat
              dibatalkan. Lanjutkan dengan hati-hati.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 pt-1">
          <div>
            <p className="text-sm font-medium">Reset Semua Data Lokal</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Menghapus semua data dari perangkat ini termasuk catatan, log
              sinkronisasi, dan konfigurasi.
            </p>
          </div>

          <Button
            variant="destructive"
            onClick={handleOpenDialog}
            className="shrink-0"
          >
            Reset Semua Data Lokal
          </Button>
        </div>
      </div>

      {/* ── Confirmation dialog ── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseDialog();
        }}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-4" />
              Konfirmasi Reset Data
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <p>
              Tindakan ini akan menghapus <strong>semua data lokal</strong>{" "}
              secara permanen, termasuk:
            </p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1 ml-1">
              <li>Semua catatan entitas (klan, peserta, pinjaman, dll.)</li>
              <li>Log sinkronisasi</li>
              <li>Konfigurasi aplikasi (token, URL API, Tenant ID)</li>
            </ul>
            <p className="text-muted-foreground">
              Setelah reset, Anda akan diarahkan ke halaman login.
            </p>

            <div className="space-y-2">
              <Label htmlFor="reset-confirm-input">
                Ketik{" "}
                <code className="bg-muted px-1 py-0.5 rounded text-destructive font-semibold">
                  {CONFIRMATION_WORD}
                </code>{" "}
                untuk mengonfirmasi
              </Label>
              <Input
                id="reset-confirm-input"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={CONFIRMATION_WORD}
                disabled={isResetting}
                autoComplete="off"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseDialog}
              disabled={isResetting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={!isConfirmed || isResetting}
            >
              {isResetting ? "Mereset…" : "Reset Sekarang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DangerZoneTab;
