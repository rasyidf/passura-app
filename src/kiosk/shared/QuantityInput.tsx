import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export interface QuantityInputProps {
  value: number | null
  onChange: (value: number | null) => void
  disabled?: boolean
}

/**
 * Large touch-friendly quantity input for animal counts in kiosk flows.
 *
 * - Accepts positive integers in the range [1, 99].
 * - Uses `inputMode="numeric"` for integer-only input on mobile.
 *
 * Requirements: 6.5 (Loan animal quantity), 9.1, 9.2
 */
export function QuantityInput({ value, onChange, disabled = false }: QuantityInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [rawValue, setRawValue] = useState<string>(value != null ? String(value) : '')

  /** Clamp n to [1, 99] or return null. */
  function clampOrNull(n: number): number | null {
    if (!Number.isFinite(n) || n < 1 || n > 99) return null
    return n
  }

  function handleBlur() {
    const parsed = parseInt(rawValue, 10)
    const clamped = Number.isNaN(parsed) ? null : clampOrNull(parsed)
    onChange(clamped)
    setRawValue(clamped != null ? String(clamped) : '')
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '')
    setRawValue(digits)

    if (digits === '') {
      onChange(null)
      return
    }

    const parsed = parseInt(digits, 10)
    const clamped = clampOrNull(parsed)
    onChange(clamped)
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={rawValue}
      onChange={handleChange}
      onBlur={handleBlur}
      disabled={disabled}
      aria-label="Jumlah hewan"
      placeholder="1"
      min={1}
      max={99}
      className={cn(
        // kiosk-btn sizing: min-height 48px, min-width 48px, 18px font — Requirement 9.1, 9.2
        'kiosk-btn',
        'w-24 rounded-md border border-input bg-background text-foreground',
        'text-center tabular-nums',
        'outline-none transition-[box-shadow,border-color]',
        'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'
      )}
    />
  )
}
