import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/auth/session";
import { db } from "@/db/local-db";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, Upload, AlertCircle, User, Shield } from "lucide-react";

export const Route = createFileRoute("/dashboard/profile")({
  component: SettingsPage,
});

const ROLE_LABEL: Record<string, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  validator: "Sesepuh / Validator",
  participant: "Peserta",
};

function SettingsPage() {
  return (
    <div className="flex-1 p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pengaturan</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola profil akun dan data aplikasi Anda.
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="backup">Backup &amp; Restore</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="backup">
          <BackupTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab() {
  const { elder } = useAuth();

  return (
    <div className="space-y-6">
      {/* Identity card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="size-4 text-muted-foreground" />
            Informasi Akun
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold text-xl shrink-0">
              {elder?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-base truncate">{elder?.name ?? "Pengguna"}</p>
              <p className="text-sm text-muted-foreground truncate">{elder?.email ?? "-"}</p>
            </div>
          </div>

          <Separator />

          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Peran</dt>
              <dd>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Shield className="size-3" />
                  {ROLE_LABEL[elder?.role ?? ""] ?? elder?.role ?? "-"}
                </Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">ID Pengguna</dt>
              <dd className="font-mono text-xs text-muted-foreground truncate max-w-[200px]">
                {elder?.id ?? "-"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Backup & Restore Tab ─────────────────────────────────────────────────────

function BackupTab() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = {
        exportedAt: new Date().toISOString(),
        version: 1,
        clans: await db.clans.toArray(),
        elders: await db.elders.toArray(),
        participants: await db.participants.toArray(),
        groups: await db.groups.toArray(),
        animalTypes: await db.animalTypes.toArray(),
        loans: await db.loans.toArray(),
        receipts: await db.receipts.toArray(),
        handovers: await db.handovers.toArray(),
        obligations: await db.obligations.toArray(),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `passura-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup berhasil diunduh.");
    } catch (err) {
      toast.error("Gagal mengekspor data.");
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="size-4 text-muted-foreground" />
            Ekspor Backup
          </CardTitle>
          <CardDescription>
            Unduh seluruh data aplikasi sebagai file JSON. Simpan file ini di
            tempat yang aman sebagai cadangan jika data lokal hilang.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="gap-2"
          >
            <Download className="size-4" />
            {isExporting ? "Mengekspor..." : "Unduh Backup (.json)"}
          </Button>
        </CardContent>
      </Card>

      {/* Import / Restore — placeholder */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="size-4 text-muted-foreground" />
            Pulihkan dari Backup
          </CardTitle>
          <CardDescription>
            Muat ulang data dari file backup yang sebelumnya diunduh.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            <AlertCircle className="size-4 mt-0.5 shrink-0" />
            <p>
              Fitur pemulihan data akan tersedia segera. Backup yang Anda unduh
              sekarang dapat digunakan pada saat fitur ini aktif.
            </p>
          </div>
          <Button variant="outline" disabled className="gap-2">
            <Upload className="size-4" />
            Pulihkan dari File
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
