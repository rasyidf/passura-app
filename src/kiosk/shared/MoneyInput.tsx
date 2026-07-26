import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export interface MoneyInputProps {
  value: number | null
  onChange: (value: number | null) => void
  disabled?: boolean
}

/**
 * Large touch-friendly Rupiah amount input for kiosk flows.
 *
 * - Displays Indonesian locale formatting (id-ID) while the field is not focused.
 * - Accepts integer-only input via `inputMode="numeric"`.
 * - Enforces min=1 and max=999,999,999.
 *
 * Requirements: 6.5, 6.6 (Loan), 7.7 (Receipt), 9.1, 9.2
 */
export function MoneyInput({ value, onChange, disabled = false }: MoneyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  // While editing we show the raw numeric string so the user can type freely.
  const [rawValue, setRawValue] = useState<string>(value != null ? String(value) : '')
  const [isFocused, setIsFocused] = useState(false)

  /** Format a number with id-ID locale, e.g. 1000000 → "1.000.000" */
  function formatDisplay(num: number): string {
    return new Intl.NumberFormat('id-ID').format(num)
  }

  /** Clamp a numeric value to [1, 999_999_999]. Returns null when out of range. */
  function clampOrNull(n: number): number | null {
    if (!Number.isFinite(n) || n < 1 || n > 999_999_999) return null
    return n
  }

  function handleFocus() {
    setIsFocused(true)
    // Seed the raw string from the current controlled value so the user can edit it.
    setRawValue(value != null ? String(value) : '')
  }

  function handleBlur() {
    setIsFocused(false)
    const parsed = parseInt(rawValue, 10)
    const clamped = Number.isNaN(parsed) ? null : clampOrNull(parsed)
    onChange(clamped)
    // Reset raw value to match the resolved value
    setRawValue(clamped != null ? String(clamped) : '')
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Strip any non-digit characters (handles paste)
    const digits = e.target.value.replace(/\D/g, '')
    setRawValue(digits)

    if (digits === '') {
      onChange(null)
      return
    }

    const parsed = parseInt(digits, 10)
    // Only call onChange when the value is within range; otherwise keep null
    // (the clamped call on blur will finalise out-of-range values).
    const clamped = clampOrNull(parsed)
    onChange(clamped)
  }

  // What to show inside the <input>:
  // • While focused: the raw digit string being typed.
  // • While blurred: the formatted locale string (or empty).
  const displayValue = isFocused
    ? rawValue
    : value != null
      ? formatDisplay(value)
      : ''

  return (
    <div className="flex items-center gap-3">
      {/* "Rp" prefix label — Requirement 6.5, 6.6, 7.7 */}
      <span
        className="kiosk-btn flex items-center justify-center font-semibold text-foreground select-none"
        aria-hidden="true"
      >
        Rp
      </span>

      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        aria-label="Jumlah rupiah"
        placeholder="0"
        min={1}
        max={999_999_999}
        className={cn(
          // kiosk-btn sizing: min-height 48px, min-width 48px, 18px font — Requirement 9.1, 9.2
          'kiosk-btn',
          'flex-1 rounded-md border border-input bg-background text-foreground',
          'text-right tabular-nums',
          'outline-none transition-[box-shadow,border-color]',
          'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'
        )}
      />
    </div>
  )
}
