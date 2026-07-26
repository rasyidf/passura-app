import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { id } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * The internal date format stored in form values — matches what
 * <Input type="date"> would produce: "yyyy-MM-dd".
 */
const STORE_FORMAT = "yyyy-MM-dd";

export interface DatePickerProps {
  /** ISO date string "yyyy-MM-dd" or empty string */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** aria-invalid forwarded from react-hook-form fieldState */
  "aria-invalid"?: boolean;
}

/**
 * Drop-in replacement for <Input type="date">.
 * Stores/emits "yyyy-MM-dd" strings so it's compatible with existing form
 * field wiring without any changes to the schema or payload builders.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = "Pilih tanggal...",
  disabled = false,
  className,
  "aria-invalid": ariaInvalid,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Parse stored string → Date for the calendar
  const selected = React.useMemo(() => {
    if (!value) return undefined;
    const d = parse(value, STORE_FORMAT, new Date());
    return isValid(d) ? d : undefined;
  }, [value]);

  function handleSelect(day: Date | undefined) {
    onChange(day ? format(day, STORE_FORMAT) : "");
    setOpen(false);
  }

  const displayText = selected
    ? format(selected, "d MMMM yyyy", { locale: id })
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={ariaInvalid}
            className={cn(
              "h-9 w-full justify-start px-3 font-normal",
              !displayText && "text-muted-foreground",
              ariaInvalid && "border-destructive",
              className
            )}
          />
        }
      >
        <CalendarIcon className="mr-2 size-4 shrink-0 opacity-50" />
        <span className="truncate">{displayText ?? placeholder}</span>
      </PopoverTrigger>

      <PopoverContent
        className="w-auto p-0"
        align="start"
        side="bottom"
      >
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          defaultMonth={selected}
          captionLayout="dropdown"
          locale={id}
          startMonth={new Date(1970, 0)}
          endMonth={new Date(new Date().getFullYear() + 5, 11)}
        />
      </PopoverContent>
    </Popover>
  );
}
