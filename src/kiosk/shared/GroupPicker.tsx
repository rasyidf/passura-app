import type { Group } from "@/db/types";

export interface GroupPickerProps {
  groups: Group[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * Accessible group/event selector rendered as a listbox — no raw <select> element.
 * Shows the group name as primary text and eventName (if present) as secondary text.
 * Requirements: 6.5, 9.5
 */
export function GroupPicker({ groups, selectedId, onSelect }: GroupPickerProps) {
  return (
    <div
      role="listbox"
      aria-label="Pilih Grup Acara"
      className="flex flex-col gap-2"
    >
      {groups.map((group) => {
        const isSelected = selectedId === group.id;
        return (
          <div
            key={group.id}
            role="option"
            aria-selected={isSelected}
            tabIndex={0}
            onClick={() => onSelect(group.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(group.id);
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
            <span className="font-semibold">{group.name}</span>
            {group.eventName && (
              <span
                className={[
                  "text-sm mt-0.5",
                  isSelected
                    ? "text-primary-foreground/80"
                    : "text-muted-foreground",
                ].join(" ")}
              >
                {group.eventName}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
