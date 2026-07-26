import * as React from "react";
import {
  format,
  parse,
  isValid,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subMonths,
  subYears,
} from "date-fns";
import { id } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

// ─── Types ────────────────────────────────────────────────────────────────────

const STORE_FORMAT = "yyyy-MM-dd";

export interface DateRangeValue {
  from: string; // "yyyy-MM-dd" or ""
  to: string;   // "yyyy-MM-dd" or ""
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(s: string): Date | undefined {
  if (!s) return undefined;
  const d = parse(s, STORE_FORMAT, new Date());
  return isValid(d) ? d : undefined;
}

function toStoreValue(r: DateRange | undefined): DateRangeValue {
  return {
    from: r?.from ? format(r.from, STORE_FORMAT) : "",
    to:   r?.to   ? format(r.to,   STORE_FORMAT) : "",
  };
}

function toDateRange(v: DateRangeValue | undefined): DateRange | undefined {
  if (!v) return undefined;
  const from = parseDate(v.from);
  const to   = parseDate(v.to);
  if (!from && !to) return undefined;
  return { from, to };
}

function formatDisplay(v: DateRangeValue | undefined): string | null {
  if (!v) return null;
  const from = parseDate(v.from);
  const to   = parseDate(v.to);
  if (!from && !to) return null;
  if (from && !to) return format(from, "d MMM yyyy", { locale: id });
  if (!from && to) return `s/d ${format(to, "d MMM yyyy", { locale: id })}`;
  if (
    from!.getMonth() === to!.getMonth() &&
    from!.getFullYear() === to!.getFullYear()
  ) {
    return `${format(from!, "d", { locale: id })}–${format(to!, "d MMM yyyy", { locale: id })}`;
  }
  return `${format(from!, "d MMM yyyy", { locale: id })} – ${format(to!, "d MMM yyyy", { locale: id })}`;
}

// ─── Presets ──────────────────────────────────────────────────────────────────

interface Preset {
  label: string;
  range: () => DateRange;
}

const PRESETS: Preset[] = [
  {
    label: "Hari ini",
    range: () => { const d = new Date(); return { from: d, to: d }; },
  },
  {
    label: "Kemarin",
    range: () => { const d = subDays(new Date(), 1); return { from: d, to: d }; },
  },
  {
    label: "7 hari terakhir",
    range: () => ({ from: subDays(new Date(), 6), to: new Date() }),
  },
  {
    label: "30 hari terakhir",
    range: () => ({ from: subDays(new Date(), 29), to: new Date() }),
  },
  {
    label: "Minggu ini",
    range: () => {
      const now = new Date();
      return { from: startOfWeek(now, { locale: id }), to: endOfWeek(now, { locale: id }) };
    },
  },
  {
    label: "Bulan ini",
    range: () => {
      const now = new Date();
      return { from: startOfMonth(now), to: endOfMonth(now) };
    },
  },
  {
    label: "Bulan lalu",
    range: () => {
      const prev = subMonths(new Date(), 1);
      return { from: startOfMonth(prev), to: endOfMonth(prev) };
    },
  },
  {
    label: "3 bulan terakhir",
    range: () => ({ from: subMonths(new Date(), 3), to: new Date() }),
  },
  {
    label: "Tahun ini",
    range: () => {
      const now = new Date();
      return { from: startOfYear(now), to: endOfYear(now) };
    },
  },
  {
    label: "Tahun lalu",
    range: () => {
      const prev = subYears(new Date(), 1);
      return { from: startOfYear(prev), to: endOfYear(prev) };
    },
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export interface DateRangePickerProps {
  value: DateRangeValue | undefined;
  onChange: (value: DateRangeValue | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Filter tanggal...",
  className,
  disabled = false,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Draft state — what the user is selecting inside the popover.
  // Only committed to parent on "Terapkan" or preset click.
  const [draft, setDraft] = React.useState<DateRange | undefined>(undefined);

  // When the popover opens, seed the draft from the current committed value.
  function handleOpenChange(next: boolean) {
    if (next) {
      setDraft(toDateRange(value));
    }
    setOpen(next);
  }

  // Presets commit immediately and close.
  function handlePreset(preset: Preset) {
    const r = preset.range();
    setDraft(r);
    onChange(toStoreValue(r));
    setOpen(false);
  }

  // Apply button — commit draft and close.
  function handleApply() {
    onChange(draft?.from || draft?.to ? toStoreValue(draft) : undefined);
    setOpen(false);
  }

  // Cancel — discard draft and close.
  function handleCancel() {
    setDraft(toDateRange(value));
    setOpen(false);
  }

  // Clear button on the trigger.
  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(undefined);
    setDraft(undefined);
  }

  const displayText = formatDisplay(value);
  const hasValue    = !!(value?.from || value?.to);
  const canApply    = !!(draft?.from || draft?.to);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "h-8 w-auto min-w-[160px] max-w-[260px] justify-start gap-1.5 px-3 font-normal",
              !displayText && "text-muted-foreground",
              className
            )}
          />
        }
      >
        <CalendarIcon className="size-4 shrink-0 opacity-50" />
        <span className="flex-1 truncate text-left text-sm">
          {displayText ?? placeholder}
        </span>
        {hasValue && (
          <span
            role="button"
            aria-label="Hapus filter tanggal"
            tabIndex={0}
            className="ml-1 size-4 shrink-0 rounded-sm opacity-50 hover:opacity-100 flex items-center justify-center"
            onClick={handleClear}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                onChange(undefined);
                setDraft(undefined);
              }
            }}
          >
            <X className="size-3.5" />
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start" side="bottom">
        <div className="flex">
          {/* ── Presets sidebar ── */}
          <div className="flex w-36 shrink-0 flex-col gap-0.5 border-r p-2">
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Rentang cepat
            </p>
            <Separator className="my-1" />
            {PRESETS.map((preset) => {
              const pr      = toStoreValue(preset.range());
              const isActive = value?.from === pr.from && value?.to === pr.to;
              return (
                <Button
                  key={preset.label}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePreset(preset)}
                  className={cn(
                    "h-7 justify-start px-2 text-xs font-normal",
                    isActive &&
                      "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                  )}
                >
                  {preset.label}
                </Button>
              );
            })}
            {hasValue && (
              <>
                <Separator className="my-1" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { onChange(undefined); setDraft(undefined); setOpen(false); }}
                  className="h-7 justify-start px-2 text-xs font-normal text-destructive hover:text-destructive"
                >
                  Hapus filter
                </Button>
              </>
            )}
          </div>

          {/* ── Calendar + footer ── */}
          <div className="flex flex-col">
            <div className="p-2">
              <Calendar
                mode="range"
                defaultMonth={draft?.from ?? new Date()}
                selected={draft}
                onSelect={setDraft}
                numberOfMonths={2}
                locale={id}
                startMonth={new Date(1970, 0)}
                endMonth={new Date(new Date().getFullYear() + 5, 11)}
                showOutsideDays={false}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t px-3 py-2 gap-2">
              <span className="text-xs text-muted-foreground min-w-0 truncate">
                {draft?.from && draft?.to
                  ? formatDisplay(toStoreValue(draft))
                  : draft?.from
                  ? `Dari ${format(draft.from, "d MMM yyyy", { locale: id })}`
                  : "Pilih tanggal awal"}
              </span>
              <div className="flex gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={handleCancel}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 px-3 text-xs"
                  disabled={!canApply}
                  onClick={handleApply}
                >
                  Terapkan
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
