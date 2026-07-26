import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { StepCard } from './StepCard'

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderCard(overrides: Partial<Parameters<typeof StepCard>[0]> = {}) {
  const defaults = {
    stepIndex: 0,
    totalSteps: 5,
    title: 'Selamat Datang',
    children: <p>Konten langkah</p>,
  }
  return render(<StepCard {...defaults} {...overrides} />)
}

// ─── Unit Tests ──────────────────────────────────────────────────────────────

describe('StepCard', () => {
  describe('progress indicator', () => {
    it('displays "Langkah N dari M" in 1-based numbering', () => {
      // stepIndex=2 (0-based) → display "Langkah 3 dari 5"
      renderCard({ stepIndex: 2, totalSteps: 5 })
      expect(screen.getByText('Langkah 3 dari 5')).toBeInTheDocument()
    })

    it('uses aria-label matching the progress text', () => {
      renderCard({ stepIndex: 0, totalSteps: 3 })
      const indicator = screen.getByText('Langkah 1 dari 3')
      expect(indicator).toHaveAttribute('aria-label', 'Langkah 1 dari 3')
    })

    it('progress indicator has at least text-lg class (Requirement 9.4)', () => {
      renderCard({ stepIndex: 0, totalSteps: 4 })
      const indicator = screen.getByText('Langkah 1 dari 4')
      // text-lg maps to font-size 18px in Tailwind
      expect(indicator.className).toMatch(/text-lg/)
    })
  })

  describe('title rendering', () => {
    it('renders the step title in an h1 with kiosk-h1 class', () => {
      renderCard({ title: 'Pilih Clan' })
      const heading = screen.getByRole('heading', { name: 'Pilih Clan' })
      expect(heading.tagName).toBe('H1')
      expect(heading.className).toMatch(/kiosk-h1/)
    })

    it('updates document.title to the step title on render', () => {
      renderCard({ title: 'Konfirmasi Data' })
      expect(document.title).toBe('Konfirmasi Data')
    })

    it('updates document.title when title prop changes', () => {
      const { rerender } = renderCard({ title: 'Langkah Pertama' })
      expect(document.title).toBe('Langkah Pertama')
      rerender(
        <StepCard stepIndex={1} totalSteps={5} title="Langkah Kedua">
          <p>Isi</p>
        </StepCard>
      )
      expect(document.title).toBe('Langkah Kedua')
    })
  })

  describe('role="main" wrapper', () => {
    it('renders a role="main" wrapper element', () => {
      renderCard()
      expect(screen.getByRole('main')).toBeInTheDocument()
    })
  })

  describe('"Lanjut" (forward) button', () => {
    it('renders the forward button with kiosk-btn class', () => {
      renderCard({ onNext: vi.fn() })
      const btn = screen.getByRole('button', { name: 'Lanjut' })
      expect(btn.className).toMatch(/kiosk-btn/)
    })

    it('calls onNext when clicked', () => {
      const onNext = vi.fn()
      renderCard({ onNext })
      fireEvent.click(screen.getByRole('button', { name: 'Lanjut' }))
      expect(onNext).toHaveBeenCalledOnce()
    })

    it('is disabled when nextDisabled is true', () => {
      renderCard({ onNext: vi.fn(), nextDisabled: true })
      expect(screen.getByRole('button', { name: 'Lanjut' })).toBeDisabled()
    })

    it('shows custom nextLabel', () => {
      renderCard({ onNext: vi.fn(), nextLabel: 'Mulai Pakai' })
      expect(screen.getByRole('button', { name: 'Mulai Pakai' })).toBeInTheDocument()
    })

    it('shows loading text and is not clickable when isLoading is true', () => {
      renderCard({ onNext: vi.fn(), isLoading: true })
      expect(screen.getByRole('button', { name: /Memuat/i })).toBeDisabled()
    })

    it('is not rendered when onNext is not provided', () => {
      renderCard() // no onNext
      expect(screen.queryByRole('button', { name: /Lanjut/i })).not.toBeInTheDocument()
    })
  })

  describe('"Kembali" (back) button', () => {
    it('renders the back button with kiosk-btn class when onBack is provided', () => {
      renderCard({ onBack: vi.fn() })
      const btn = screen.getByRole('button', { name: 'Kembali' })
      expect(btn.className).toMatch(/kiosk-btn/)
    })

    it('calls onBack when clicked', () => {
      const onBack = vi.fn()
      renderCard({ onBack })
      fireEvent.click(screen.getByRole('button', { name: 'Kembali' }))
      expect(onBack).toHaveBeenCalledOnce()
    })

    it('shows custom backLabel', () => {
      renderCard({ onBack: vi.fn(), backLabel: 'Batal' })
      expect(screen.getByRole('button', { name: 'Batal' })).toBeInTheDocument()
    })

    it('is not rendered when onBack is not provided', () => {
      renderCard() // no onBack
      expect(screen.queryByRole('button', { name: /Kembali/i })).not.toBeInTheDocument()
    })

    it('is disabled when isLoading is true', () => {
      renderCard({ onBack: vi.fn(), onNext: vi.fn(), isLoading: true })
      expect(screen.getByRole('button', { name: 'Kembali' })).toBeDisabled()
    })
  })

  describe('max one primary action (Requirement 9.3)', () => {
    it('renders at most one primary (forward) button even when both callbacks are provided', () => {
      renderCard({ onNext: vi.fn(), onBack: vi.fn() })
      // There is exactly one primary (forward-progression) button — the forward one.
      // We verify by checking that only one button has the bg-primary styling (forward btn)
      // and one has border styling (back btn).
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(2)
      const primaryBtns = buttons.filter((b) => b.className.includes('bg-primary'))
      expect(primaryBtns).toHaveLength(1)
    })
  })

  describe('children', () => {
    it('renders children inside the card', () => {
      renderCard({ children: <span data-testid="child">Isi langkah</span> })
      expect(screen.getByTestId('child')).toBeInTheDocument()
    })
  })
})

// ─── Property-Based Test ──────────────────────────────────────────────────────

/**
 * Property 6: Every rendered StepCard contains a progress indicator
 *
 * For any step index N (0 ≤ N < totalSteps) in any wizard or kiosk flow,
 * rendering the StepCard component must produce a DOM node containing the
 * text pattern "N+1 dari M" and the corresponding aria-label.
 *
 * **Validates: Requirements 2.3, 9.4**
 */
describe('Property 6 — every StepCard has a progress indicator', () => {
  it('always renders "Langkah N+1 dari M" for any valid stepIndex', () => {
    fc.assert(
      fc.property(
        // totalSteps: 1..20 (realistic wizard range)
        fc.integer({ min: 1, max: 20 }),
        // stepIndex: 0-based, must be < totalSteps
        fc.integer({ min: 0, max: 19 }),
        (totalSteps, rawStepIndex) => {
          const stepIndex = rawStepIndex % totalSteps // keep in range [0, totalSteps)
          const expectedText = `Langkah ${stepIndex + 1} dari ${totalSteps}`

          const { unmount } = render(
            <StepCard
              stepIndex={stepIndex}
              totalSteps={totalSteps}
              title={`Langkah ${stepIndex + 1}`}
            >
              <span>konten</span>
            </StepCard>
          )

          const indicator = document.querySelector(`[aria-label="${expectedText}"]`)
          const hasText = indicator?.textContent === expectedText
          unmount()

          return hasText === true
        }
      ),
      { numRuns: 100 }
    )
  })
})
