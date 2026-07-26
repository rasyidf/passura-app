import type { AnimalType } from "@/db/types";

export interface AnimalTypePickerProps {
  animalTypes: AnimalType[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /**
   * When true, only shows AnimalType records with category === "buffalo" or "pig".
   * Used in kiosk loan/receipt/handover flows (Requirement 6.5).
   */
  filterKiosk?: boolean;
}

const QUALITY_LABEL: Record<AnimalType["quality"], string> = {
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
  unique: "Unik",
};

/**
 * Accessible animal type selector rendered as a listbox — no raw <select> element.
 * When filterKiosk is true, only buffalo and pig categories are shown (Requirement 6.5).
 * Requirements: 6.5, 9.5
 */
export function AnimalTypePicker({
  animalTypes,
  selectedId,
  onSelect,
  filterKiosk = false,
}: AnimalTypePickerProps) {
  const visibleTypes = filterKiosk
    ? animalTypes.filter(
        (at) => at.category === "buffalo" || at.category === "pig"
      )
    : animalTypes;

  return (
    <div
      role="listbox"
      aria-label="Pilih Jenis Hewan"
      className="flex flex-col gap-2"
    >
      {visibleTypes.map((animalType) => {
        const isSelected = selectedId === animalType.id;
        return (
          <div
            key={animalType.id}
            role="option"
            aria-selected={isSelected}
            tabIndex={0}
            onClick={() => onSelect(animalType.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(animalType.id);
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
            <span className="font-semibold">{animalType.name}</span>
            <span
              className={[
                "text-sm mt-0.5",
                isSelected
                  ? "text-primary-foreground/80"
                  : "text-muted-foreground",
              ].join(" ")}
            >
              {animalType.breed}
              {animalType.quality
                ? ` — ${QUALITY_LABEL[animalType.quality]}`
                : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
