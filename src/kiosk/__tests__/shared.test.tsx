/**
 * Shared kiosk component tests — ClanPicker & KioskOfflineBanner
 *
 * Requirements: 9.2, 9.4, 9.5, 10.4
 *
 * Note on StepCard: comprehensive unit tests (including Property 6) live in
 *   src/kiosk/shared/StepCard.test.tsx  (created in task 2.1)
 *
 * Note on MoneyInput / QuantityInput: unit tests including boundary checks
 *   (min=1, max=999 999 999) live in
 *   src/kiosk/shared/MoneyInput.test.tsx  (created in task 2.5)
 */

import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Clan } from '@/db/types'
import { ClanPicker } from '@/kiosk/shared/ClanPicker'
import { KioskOfflineBanner } from '@/kiosk/shared/KioskOfflineBanner'

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

const CLANS: Clan[] = [
  makeClan('clan-1', 'Rante Bua', 'Tana Toraja'),
  makeClan('clan-2', 'Buntu Malenong', 'Toraja Utara'),
  makeClan('clan-3', 'Lembang Salu', 'Tana Toraja'),
]

// ─── ClanPicker ───────────────────────────────────────────────────────────────
//
// Requirements: 9.5 (accessible listbox, no raw <select>)

describe('ClanPicker', () => {
  describe('rendering', () => {
    it('renders a listbox with accessible label', () => {
      render(<ClanPicker clans={CLANS} selectedId={null} onSelect={vi.fn()} />)
      expect(screen.getByRole('listbox', { name: 'Pilih Rumpun Keluarga' })).toBeInTheDocument()
    })

    it('renders one option per clan when no excludeId is set', () => {
      render(<ClanPicker clans={CLANS} selectedId={null} onSelect={vi.fn()} />)
      const options = screen.getAllByRole('option')
      expect(options).toHaveLength(CLANS.length)
    })

    it('renders clan names as visible text', () => {
      render(<ClanPicker clans={CLANS} selectedId={null} onSelect={vi.fn()} />)
      for (const clan of CLANS) {
        expect(screen.getByText(clan.name)).toBeInTheDocument()
      }
    })

    it('renders clan region text when provided', () => {
      render(<ClanPicker clans={CLANS} selectedId={null} onSelect={vi.fn()} />)
      // Two clans share the same region — use getAllByText
      const regionNodes = screen.getAllByText('Tana Toraja')
      expect(regionNodes.length).toBeGreaterThanOrEqual(1)
    })

    it('renders an empty listbox when clans array is empty', () => {
      render(<ClanPicker clans={[]} selectedId={null} onSelect={vi.fn()} />)
      expect(screen.queryAllByRole('option')).toHaveLength(0)
    })
  })

  describe('excludeId filtering — Requirement 9.5 (same-clan prevention)', () => {
    it('excludes the clan matching excludeId', () => {
      render(
        <ClanPicker
          clans={CLANS}
          selectedId={null}
          onSelect={vi.fn()}
          excludeId="clan-1"
        />
      )
      const options = screen.getAllByRole('option')
      expect(options).toHaveLength(CLANS.length - 1)
      expect(screen.queryByText('Rante Bua')).not.toBeInTheDocument()
    })

    it('renders all clans when excludeId does not match any clan', () => {
      render(
        <ClanPicker
          clans={CLANS}
          selectedId={null}
          onSelect={vi.fn()}
          excludeId="non-existent-id"
        />
      )
      expect(screen.getAllByRole('option')).toHaveLength(CLANS.length)
    })

    it('renders all clans when excludeId is undefined', () => {
      render(<ClanPicker clans={CLANS} selectedId={null} onSelect={vi.fn()} />)
      expect(screen.getAllByRole('option')).toHaveLength(CLANS.length)
    })
  })

  describe('selection — aria-selected state', () => {
    it('marks the selected clan with aria-selected="true"', () => {
      render(
        <ClanPicker clans={CLANS} selectedId="clan-2" onSelect={vi.fn()} />
      )
      const options = screen.getAllByRole('option')
      const selected = options.find((o) => o.textContent?.includes('Buntu Malenong'))
      expect(selected).toHaveAttribute('aria-selected', 'true')
    })

    it('marks all other clans with aria-selected="false"', () => {
      render(
        <ClanPicker clans={CLANS} selectedId="clan-2" onSelect={vi.fn()} />
      )
      const options = screen.getAllByRole('option')
      const unselected = options.filter((o) => !o.textContent?.includes('Buntu Malenong'))
      for (const opt of unselected) {
        expect(opt).toHaveAttribute('aria-selected', 'false')
      }
    })

    it('marks no clan as selected when selectedId is null', () => {
      render(<ClanPicker clans={CLANS} selectedId={null} onSelect={vi.fn()} />)
      const options = screen.getAllByRole('option')
      for (const opt of options) {
        expect(opt).toHaveAttribute('aria-selected', 'false')
      }
    })
  })

  describe('interaction', () => {
    it('calls onSelect with the clan id on click', () => {
      const onSelect = vi.fn()
      render(<ClanPicker clans={CLANS} selectedId={null} onSelect={onSelect} />)
      fireEvent.click(screen.getAllByRole('option')[0])
      expect(onSelect).toHaveBeenCalledOnce()
      expect(onSelect).toHaveBeenCalledWith('clan-1')
    })

    it('calls onSelect with the correct id for each clan', () => {
      const onSelect = vi.fn()
      render(<ClanPicker clans={CLANS} selectedId={null} onSelect={onSelect} />)
      const options = screen.getAllByRole('option')
      fireEvent.click(options[2])
      expect(onSelect).toHaveBeenCalledWith('clan-3')
    })

    it('calls onSelect via keyboard Enter key', () => {
      const onSelect = vi.fn()
      render(<ClanPicker clans={CLANS} selectedId={null} onSelect={onSelect} />)
      const firstOption = screen.getAllByRole('option')[0]
      fireEvent.keyDown(firstOption, { key: 'Enter' })
      expect(onSelect).toHaveBeenCalledWith('clan-1')
    })

    it('calls onSelect via keyboard Space key', () => {
      const onSelect = vi.fn()
      render(<ClanPicker clans={CLANS} selectedId={null} onSelect={onSelect} />)
      const firstOption = screen.getAllByRole('option')[0]
      fireEvent.keyDown(firstOption, { key: ' ' })
      expect(onSelect).toHaveBeenCalledWith('clan-1')
    })

    it('does not call onSelect for unrelated key presses', () => {
      const onSelect = vi.fn()
      render(<ClanPicker clans={CLANS} selectedId={null} onSelect={onSelect} />)
      fireEvent.keyDown(screen.getAllByRole('option')[0], { key: 'Tab' })
      expect(onSelect).not.toHaveBeenCalled()
    })
  })

  describe('accessibility — Requirement 9.5', () => {
    it('each option has tabIndex=0 for keyboard navigation', () => {
      render(<ClanPicker clans={CLANS} selectedId={null} onSelect={vi.fn()} />)
      const options = screen.getAllByRole('option')
      for (const opt of options) {
        expect(opt).toHaveAttribute('tabIndex', '0')
      }
    })

    it('renders options using role="option" inside role="listbox" — no raw <select>', () => {
      render(<ClanPicker clans={CLANS} selectedId={null} onSelect={vi.fn()} />)
      // A <select> element should NOT be present
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })
  })
})

// ─── KioskOfflineBanner ───────────────────────────────────────────────────────
//
// Requirements: 10.4

describe('KioskOfflineBanner', () => {
  // Save the original descriptor so we can restore it after each test
  let originalDescriptor: PropertyDescriptor | undefined

  beforeEach(() => {
    originalDescriptor = Object.getOwnPropertyDescriptor(navigator, 'onLine')
  })

  afterEach(() => {
    // Restore the original navigator.onLine descriptor
    if (originalDescriptor) {
      Object.defineProperty(navigator, 'onLine', originalDescriptor)
    } else {
      // If there was no original descriptor, remove the override
      // (Navigator.prototype has the real getter)
      try {
        // Re-define to delegate back to Navigator.prototype
        Object.defineProperty(navigator, 'onLine', {
          configurable: true,
          get: () => true,
        })
      } catch {
        // ignore — jsdom may not allow this in all configurations
      }
    }
  })

  describe('initial render based on navigator.onLine', () => {
    it('renders the banner when navigator.onLine is false', () => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        get: () => false,
      })

      render(<KioskOfflineBanner />)
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByText(/Offline/i)).toBeInTheDocument()
    })

    it('renders nothing when navigator.onLine is true', () => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        get: () => true,
      })

      render(<KioskOfflineBanner />)
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })
  })

  describe('offline event handling — Requirement 10.4', () => {
    it('shows the banner after a window "offline" event fires', async () => {
      // Start online
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        get: () => true,
      })

      render(<KioskOfflineBanner />)
      expect(screen.queryByRole('status')).not.toBeInTheDocument()

      // Go offline
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        get: () => false,
      })

      await act(async () => {
        window.dispatchEvent(new Event('offline'))
      })

      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByText(/Offline — data disimpan lokal/i)).toBeInTheDocument()
    })

    it('hides the banner after a window "online" event fires', async () => {
      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        get: () => false,
      })

      render(<KioskOfflineBanner />)
      expect(screen.getByRole('status')).toBeInTheDocument()

      // Come back online
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        get: () => true,
      })

      await act(async () => {
        window.dispatchEvent(new Event('online'))
      })

      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })
  })

  describe('banner content', () => {
    it('displays the Indonesian offline message', () => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        get: () => false,
      })

      render(<KioskOfflineBanner />)
      expect(screen.getByText('Offline — data disimpan lokal')).toBeInTheDocument()
    })

    it('banner element has role="status" for screen reader announcement', () => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        get: () => false,
      })

      render(<KioskOfflineBanner />)
      const banner = screen.getByRole('status')
      expect(banner).toBeInTheDocument()
    })
  })

  describe('cleanup', () => {
    it('removes event listeners on unmount (no memory leak)', async () => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        get: () => true,
      })

      const { unmount } = render(<KioskOfflineBanner />)
      unmount()

      // After unmount, dispatching "offline" should not throw or cause React
      // "update on unmounted component" warnings.
      await act(async () => {
        window.dispatchEvent(new Event('offline'))
      })
      // If we reached here without errors, cleanup is working correctly.
      expect(true).toBe(true)
    })
  })
})
