import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Users } from "lucide-react";
import type { Clan, Group } from "@/db/types";

interface GroupClanViewerDialogProps {
  group: Group | null;
  clanById: Record<string, Clan>;
  onClose: () => void;
}

/** Read-only dialog that lists the clans belonging to a group. */
export function GroupClanViewerDialog({
  group,
  clanById,
  onClose,
}: GroupClanViewerDialogProps) {
  return (
    <Dialog open={!!group} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Clan dalam "{group?.name}"</DialogTitle>
          <DialogDescription>Daftar clan yang tergabung dalam grup ini.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2 max-h-72 overflow-y-auto">
          {(group?.members ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Belum ada clan.</p>
          ) : (
            group?.members.map((clanId) => {
              const clan = clanById[clanId];
              return (
                <div key={clanId} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                  <Users className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{clan?.name ?? clanId}</p>
                    {clan?.region && (
                      <p className="text-xs text-muted-foreground truncate">{clan.region}</p>
                    )}
                  </div>
                  {!clan && (
                    <Badge variant="destructive" className="ml-auto text-xs">
                      Tidak ditemukan
                    </Badge>
                  )}
                </div>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
