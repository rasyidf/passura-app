/**
 * Axe-core accessibility tests for wizard and kiosk shared components.
 *
 * Validates: Requirements 9.7 (WCAG AA contrast) and overall accessibility.
 *
 * NOTE: axe-core running inside jsdom (the Vitest test environment) cannot
 * verify visual properties like colour contrast ratios, because jsdom does not
 * compute CSS. Contrast checks therefore will NOT be caught here — they require
 * a real browser or a tool like Playwright + axe-playwright. This file covers
 * structural / ARIA violations (missing roles, labels, aria attributes, etc.)
 * that axe can evaluate in a pure DOM environment.
 *
 * For full WCAG AA contrast validation use:
 *   - Manual review against the design palette (design.md §Accessibility)
 *   - A browser-based audit with the axe DevTools extension
 *   - An automated E2E suite (e.g. Playwright + @axe-core/playwright)
 */

import axeCore from 'axe-core'
import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { Clan } from '@/db/types'

// Components under test
import { StepCard } from '@/kiosk/shared/StepCard'
import { ClanPicker } from '@/kiosk/shared/ClanPicker'
import { KioskErrorBanner } from '@/kiosk/shared/KioskErrorBanner'
import { KioskOfflineBanner } from '@/kiosk/shared/KioskOfflineBanner'

// ─── axe helper ───────────────────────────────────────────────────────────────

/**
 * Run axe on the given container element and assert there are no violations.
 * Returns a plain Vitest assertion so failures show the violation details.
 */
async function assertNoAxeViolations(container: Element): Promise<void> {
  const results = await axeCore.run(container)
  const violations = results.violations
  if (violations.length > 0) {
    const details = violations
      .map(
        (v) =>
          `[${v.id}] ${v.help}\n` +
          v.nodes
            .map((n) => `  selector: ${n.target.join(', ')}\n  html: ${n.html}`)
            .join('\n')
      )
      .join('\n\n')
    throw new Error(`Expected no axe violations, but found ${violations.length}:\n\n${details}`)
  }
  expect(violations).toHaveLength(0)
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeClan(id: string, name: string, region?: string): Clan {
  return {
    id,
    name,
    region,
    syncStatus: 'synced',
    createdAt: 0,
    updatedAt: 0,
  }
}

const SAMPLE_CLANS: Clan[] = [
  makeClan('clan-1', 'Rante Bua', 'Tana Toraja'),
  makeClan('clan-2', 'Buntu Malenong', 'Toraja Utara'),
  makeClan('clan-3', 'Lembang Salu', 'Tana Toraja'),
]

// ─── StepCard ─────────────────────────────────────────────────────────────────

describe('StepCard — axe accessibility', () => {
  it('has no axe violations at step index 0 (first step, back button hidden)', async () => {
    const { container } = render(
      <StepCard
        stepIndex={0}
        totalSteps={5}
        title="Selamat Datang"
        onNext={vi.fn()}
      >
        <p>Selamat datang di alur orientasi.</p>
      </StepCard>
    )
    await assertNoAxeViolations(container)
  })

  it('has no axe violations at a middle step index (back + next buttons both visible)', async () => {
    const { container } = render(
      <StepCard
        stepIndex={2}
        totalSteps={5}
        title="Pilih Klan"
        onNext={vi.fn()}
        onBack={vi.fn()}
      >
        <p>Silakan pilih klan Anda.</p>
      </StepCard>
    )
    await assertNoAxeViolations(container)
  })

  it('has no axe violations at the last step index (forward button disabled)', async () => {
    const { container } = render(
      <StepCard
        stepIndex={4}
        totalSteps={5}
        title="Selesai"
        onBack={vi.fn()}
        nextDisabled
      >
        <p>Pengaturan selesai.</p>
      </StepCard>
    )
    await assertNoAxeViolations(container)
  })

  it('has no axe violations while in loading state', async () => {
    const { container } = render(
      <StepCard
        stepIndex={1}
        totalSteps={3}
        title="Menyimpan…"
        onNext={vi.fn()}
        onBack={vi.fn()}
        isLoading
      >
        <p>Harap tunggu.</p>
      </StepCard>
    )
    await assertNoAxeViolations(container)
  })
})

// ─── ClanPicker ───────────────────────────────────────────────────────────────

describe('ClanPicker — axe accessibility', () => {
  it('has no axe violations with multiple clans and no selection', async () => {
    const { container } = render(
      <ClanPicker
        clans={SAMPLE_CLANS}
        selectedId={null}
        onSelect={vi.fn()}
      />
    )
    await assertNoAxeViolations(container)
  })

  it('has no axe violations when one clan is selected', async () => {
    const { container } = render(
      <ClanPicker
        clans={SAMPLE_CLANS}
        selectedId="clan-2"
        onSelect={vi.fn()}
      />
    )
    await assertNoAxeViolations(container)
  })

  it('has no axe violations when excludeId filters one clan out', async () => {
    const { container } = render(
      <ClanPicker
        clans={SAMPLE_CLANS}
        selectedId={null}
        onSelect={vi.fn()}
        excludeId="clan-1"
      />
    )
    await assertNoAxeViolations(container)
  })

  it('has no axe violations with an empty clan list', async () => {
    const { container } = render(
      <ClanPicker
        clans={[]}
        selectedId={null}
        onSelect={vi.fn()}
      />
    )
    await assertNoAxeViolations(container)
  })
})

// ─── KioskErrorBanner ─────────────────────────────────────────────────────────

describe('KioskErrorBanner — axe accessibility', () => {
  it('has no axe violations with a short error message', async () => {
    const { container } = render(
      <KioskErrorBanner message="Gagal menyimpan. Coba lagi?" />
    )
    await assertNoAxeViolations(container)
  })

  it('has no axe violations with a long error message', async () => {
    const { container } = render(
      <KioskErrorBanner message="Terjadi kesalahan saat menyimpan data. Data Anda belum hilang. Silakan coba lagi atau hubungi administrator." />
    )
    await assertNoAxeViolations(container)
  })
})

// ─── KioskOfflineBanner ───────────────────────────────────────────────────────

describe('KioskOfflineBanner — axe accessibility', () => {
  it('has no axe violations when rendered in offline state', async () => {
    // Override navigator.onLine to simulate an offline device
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => false,
    })

    const { container } = render(<KioskOfflineBanner />)
    await assertNoAxeViolations(container)

    // Restore
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => true,
    })
  })

  it('renders no DOM nodes (and therefore no violations) when online', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => true,
    })

    const { container } = render(<KioskOfflineBanner />)
    // Component returns null when online — empty container is trivially accessible
    await assertNoAxeViolations(container)
  })
})
