import type { Clan } from "@/db/types";

export interface ClanPickerProps {
  clans: Clan[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  excludeId?: string;
}

/**
 * Accessible clan selector rendered as a listbox — no raw <select> element.
 * Requirements: 9.5, 9.6
 */
export function ClanPicker({ clans, selectedId, onSelect, excludeId }: ClanPickerProps) {
  const visibleClans = clans.filter((clan) => clan.id !== excludeId);

  return (
    <div
      role="listbox"
      aria-label="Pilih Rumpun Keluarga"
      className="flex flex-col gap-2"
    >
      {visibleClans.map((clan) => {
        const isSelected = selectedId === clan.id;
        return (
          <div
            key={clan.id}
            role="option"
            aria-selected={isSelected}
            tabIndex={0}
            onClick={() => onSelect(clan.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(clan.id);
              }
            }}
            className={[
              "kiosk-card",
              "flex flex-col justify-center cursor-pointer rounded-lg border outline-none",
              "transition-colors",
              "focus:ring-2 focus:ring-primary focus:outline-none",
              "text-lg",
              isSelected
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground",
            ].join(" ")}
          >
            <span className="font-semibold">{clan.name}</span>
            {clan.region && (
              <span className={["text-sm mt-0.5", isSelected ? "text-primary-foreground/80" : "text-muted-foreground"].join(" ")}>
                {clan.region}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
