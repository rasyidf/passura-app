import * as React from 'react'
import { format, parseISO } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface DatePickerProps {
  /** ISO date string (e.g. "2024-01-15") or null to default to today */
  value: string | null
  onChange: (date: string) => void
  disabled?: boolean
}

/**
 * Touch-friendly date picker for kiosk flows.
 *
 * - Wraps shadcn/ui Calendar in a Popover
 * - Trigger button meets 48×48 px minimum touch target via `.kiosk-btn`
 * - Displays date in Indonesian locale ("15 Januari 2024") with dd/MM/yyyy fallback
 * - Defaults to today when `value` is null
 *
 * Requirements: 6.1, 7.1, 8.1, 9.2
 */
export function DatePicker({ value, onChange, disabled = false }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Resolve the current Date object: use value if provided, otherwise today
  const selectedDate: Date = React.useMemo(() => {
    if (value) {
      try {
        return parseISO(value)
      } catch {
        // fall through to today on parse error
      }
    }
    return new Date()
  }, [value])

  // Format for display — Indonesian locale preferred, dd/MM/yyyy as fallback
  const displayLabel = React.useMemo(() => {
    try {
      return format(selectedDate, 'd MMMM yyyy', { locale: idLocale })
    } catch {
      return format(selectedDate, 'dd/MM/yyyy')
    }
  }, [selectedDate])

  function handleSelect(day: Date | undefined) {
    if (!day) return
    // Emit as ISO date string "YYYY-MM-DD" (no time component)
    onChange(format(day, 'yyyy-MM-dd'))
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            disabled={disabled}
            aria-label={`Pilih tanggal, sekarang ${displayLabel}`}
            className={cn(
              'kiosk-btn',
              'flex items-center gap-3 rounded-lg border border-input bg-background text-foreground',
              'hover:bg-accent hover:text-accent-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:pointer-events-none disabled:opacity-50',
              'transition-colors text-lg font-normal',
              // Ensure full-width so the touch target is easy to tap on mobile
              'w-full justify-start'
            )}
          />
        }
      >
        <CalendarIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span>{displayLabel}</span>
      </PopoverTrigger>

      <PopoverContent
        className="w-auto p-0"
        align="start"
        // Keep the popover above the virtual keyboard on mobile
        sideOffset={8}
      >
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          // Disable future dates beyond a reasonable range if needed; leave open for now
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
