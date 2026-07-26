 import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import fc from 'fast-check'
import { MoneyInput } from './MoneyInput'
import { QuantityInput } from './QuantityInput'

// ─── MoneyInput ───────────────────────────────────────────────────────────────

describe('MoneyInput', () => {
  describe('rendering', () => {
    it('renders the "Rp" prefix label', () => {
      render(<MoneyInput value={null} onChange={vi.fn()} />)
      expect(screen.getByText('Rp')).toBeInTheDocument()
    })

    it('renders an input with aria-label "Jumlah rupiah"', () => {
      render(<MoneyInput value={null} onChange={vi.fn()} />)
      expect(screen.getByLabelText('Jumlah rupiah')).toBeInTheDocument()
    })

    it('applies kiosk-btn class to the input (Requirement 9.2)', () => {
      render(<MoneyInput value={null} onChange={vi.fn()} />)
      const input = screen.getByLabelText('Jumlah rupiah')
      expect(input.className).toMatch(/kiosk-btn/)
    })

    it('sets inputMode="numeric" for integer-only input', () => {
      render(<MoneyInput value={null} onChange={vi.fn()} />)
      const input = screen.getByLabelText('Jumlah rupiah')
      expect(input).toHaveAttribute('inputMode', 'numeric')
    })

    it('displays empty string when value is null and not focused', () => {
      render(<MoneyInput value={null} onChange={vi.fn()} />)
      const input = screen.getByLabelText('Jumlah rupiah') as HTMLInputElement
      expect(input.value).toBe('')
    })

    it('displays formatted id-ID locale value when blurred (e.g. 1000000 → "1.000.000")', () => {
      render(<MoneyInput value={1_000_000} onChange={vi.fn()} />)
      const input = screen.getByLabelText('Jumlah rupiah') as HTMLInputElement
      // id-ID locale uses period as thousands separator
      expect(input.value).toBe('1.000.000')
    })

    it('is disabled when disabled prop is true', () => {
      render(<MoneyInput value={null} onChange={vi.fn()} disabled />)
      expect(screen.getByLabelText('Jumlah rupiah')).toBeDisabled()
    })
  })

  describe('value entry', () => {
    it('calls onChange with a number when a valid integer is typed', () => {
      const onChange = vi.fn()
      render(<MoneyInput value={null} onChange={onChange} />)
      const input = screen.getByLabelText('Jumlah rupiah')
      fireEvent.focus(input)
      fireEvent.change(input, { target: { value: '5000' } })
      expect(onChange).toHaveBeenCalledWith(5000)
    })

    it('calls onChange with null when input is cleared', () => {
      const onChange = vi.fn()
      render(<MoneyInput value={500} onChange={onChange} />)
      const input = screen.getByLabelText('Jumlah rupiah')
      fireEvent.focus(input)
      fireEvent.change(input, { target: { value: '' } })
      expect(onChange).toHaveBeenCalledWith(null)
    })

    it('strips non-digit characters from pasted input', () => {
      const onChange = vi.fn()
      render(<MoneyInput value={null} onChange={onChange} />)
      const input = screen.getByLabelText('Jumlah rupiah')
      fireEvent.focus(input)
      fireEvent.change(input, { target: { value: 'Rp 1.000' } })
      // Non-digits stripped → "1000" → parsed to 1000
      expect(onChange).toHaveBeenCalledWith(1000)
    })

    it('calls onChange with null when value is below min (0)', () => {
      const onChange = vi.fn()
      render(<MoneyInput value={null} onChange={onChange} />)
      const input = screen.getByLabelText('Jumlah rupiah')
      fireEvent.focus(input)
      fireEvent.change(input, { target: { value: '0' } })
      // 0 < 1 → clamp returns null
      expect(onChange).toHaveBeenCalledWith(null)
    })

    it('calls onChange with null when value exceeds max (1_000_000_000)', () => {
      const onChange = vi.fn()
      render(<MoneyInput value={null} onChange={onChange} />)
      const input = screen.getByLabelText('Jumlah rupiah')
      fireEvent.focus(input)
      fireEvent.change(input, { target: { value: '1000000000' } })
      // 1_000_000_000 > 999_999_999 → clamp returns null
      expect(onChange).toHaveBeenCalledWith(null)
    })

    it('accepts the minimum value of 1', () => {
      const onChange = vi.fn()
      render(<MoneyInput value={null} onChange={onChange} />)
      const input = screen.getByLabelText('Jumlah rupiah')
      fireEvent.focus(input)
      fireEvent.change(input, { target: { value: '1' } })
      expect(onChange).toHaveBeenCalledWith(1)
    })

    it('accepts the maximum value of 999999999', () => {
      const onChange = vi.fn()
      render(<MoneyInput value={null} onChange={onChange} />)
      const input = screen.getByLabelText('Jumlah rupiah')
      fireEvent.focus(input)
      fireEvent.change(input, { target: { value: '999999999' } })
      expect(onChange).toHaveBeenCalledWith(999_999_999)
    })

    it('shows raw digit string while focused', () => {
      render(<MoneyInput value={1_000_000} onChange={vi.fn()} />)
      const input = screen.getByLabelText('Jumlah rupiah') as HTMLInputElement
      fireEvent.focus(input)
      // After focus the raw value should be the unformatted integer string
      expect(input.value).toBe('1000000')
    })

    it('shows formatted value after blur when parent provides updated value prop', () => {
      // MoneyInput is controlled — the display reverts to the formatted `value` prop on blur.
      // We simulate a parent that updates `value` after onChange is called.
      let currentValue: number | null = null
      const onChange = vi.fn((v: number | null) => { currentValue = v })

      const { rerender } = render(<MoneyInput value={currentValue} onChange={onChange} />)
      const input = screen.getByLabelText('Jumlah rupiah') as HTMLInputElement

      fireEvent.focus(input)
      fireEvent.change(input, { target: { value: '50000' } })
      // Simulate parent re-render with the new value
      rerender(<MoneyInput value={50000} onChange={onChange} />)
      fireEvent.blur(input)

      // After blur with value=50000, the input should display id-ID formatted string
      expect(input.value).toBe('50.000')
    })
  })
})

// ─── QuantityInput ────────────────────────────────────────────────────────────

describe('QuantityInput', () => {
  describe('rendering', () => {
    it('renders an input with aria-label "Jumlah hewan"', () => {
      render(<QuantityInput value={null} onChange={vi.fn()} />)
      expect(screen.getByLabelText('Jumlah hewan')).toBeInTheDocument()
    })

    it('applies kiosk-btn class (Requirement 9.2)', () => {
      render(<QuantityInput value={null} onChange={vi.fn()} />)
      const input = screen.getByLabelText('Jumlah hewan')
      expect(input.className).toMatch(/kiosk-btn/)
    })

    it('sets inputMode="numeric"', () => {
      render(<QuantityInput value={null} onChange={vi.fn()} />)
      expect(screen.getByLabelText('Jumlah hewan')).toHaveAttribute('inputMode', 'numeric')
    })

    it('displays empty string when value is null', () => {
      render(<QuantityInput value={null} onChange={vi.fn()} />)
      const input = screen.getByLabelText('Jumlah hewan') as HTMLInputElement
      expect(input.value).toBe('')
    })

    it('displays the current value', () => {
      render(<QuantityInput value={5} onChange={vi.fn()} />)
      const input = screen.getByLabelText('Jumlah hewan') as HTMLInputElement
      expect(input.value).toBe('5')
    })

    it('is disabled when disabled prop is true', () => {
      render(<QuantityInput value={null} onChange={vi.fn()} disabled />)
      expect(screen.getByLabelText('Jumlah hewan')).toBeDisabled()
    })
  })

  describe('value entry', () => {
    it('calls onChange with a number when a valid integer is typed', () => {
      const onChange = vi.fn()
      render(<QuantityInput value={null} onChange={onChange} />)
      const input = screen.getByLabelText('Jumlah hewan')
      fireEvent.change(input, { target: { value: '3' } })
      expect(onChange).toHaveBeenCalledWith(3)
    })

    it('calls onChange with null when input is cleared', () => {
      const onChange = vi.fn()
      render(<QuantityInput value={5} onChange={onChange} />)
      const input = screen.getByLabelText('Jumlah hewan')
      fireEvent.change(input, { target: { value: '' } })
      expect(onChange).toHaveBeenCalledWith(null)
    })

    it('strips non-digit characters', () => {
      const onChange = vi.fn()
      render(<QuantityInput value={null} onChange={onChange} />)
      const input = screen.getByLabelText('Jumlah hewan')
      fireEvent.change(input, { target: { value: '3 ekor' } })
      // "3 ekor" → digits "3" → 3
      expect(onChange).toHaveBeenCalledWith(3)
    })

    it('calls onChange with null when value is 0 (below min)', () => {
      const onChange = vi.fn()
      render(<QuantityInput value={null} onChange={onChange} />)
      const input = screen.getByLabelText('Jumlah hewan')
      fireEvent.change(input, { target: { value: '0' } })
      expect(onChange).toHaveBeenCalledWith(null)
    })

    it('calls onChange with null when value exceeds 99', () => {
      const onChange = vi.fn()
      render(<QuantityInput value={null} onChange={onChange} />)
      const input = screen.getByLabelText('Jumlah hewan')
      fireEvent.change(input, { target: { value: '100' } })
      expect(onChange).toHaveBeenCalledWith(null)
    })

    it('accepts the minimum value of 1', () => {
      const onChange = vi.fn()
      render(<QuantityInput value={null} onChange={onChange} />)
      const input = screen.getByLabelText('Jumlah hewan')
      fireEvent.change(input, { target: { value: '1' } })
      expect(onChange).toHaveBeenCalledWith(1)
    })

    it('accepts the maximum value of 99', () => {
      const onChange = vi.fn()
      render(<QuantityInput value={null} onChange={onChange} />)
      const input = screen.getByLabelText('Jumlah hewan')
      fireEvent.change(input, { target: { value: '99' } })
      expect(onChange).toHaveBeenCalledWith(99)
    })

    it('finalises out-of-range value to null on blur', () => {
      const onChange = vi.fn()
      render(<QuantityInput value={null} onChange={onChange} />)
      const input = screen.getByLabelText('Jumlah hewan')
      // Type something that becomes out-of-range only after parsing (e.g., "200")
      fireEvent.change(input, { target: { value: '200' } })
      onChange.mockClear()
      fireEvent.blur(input)
      expect(onChange).toHaveBeenCalledWith(null)
    })
  })
})
