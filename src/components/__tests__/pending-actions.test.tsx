/**
 * Unit tests for PendingActionsPanel — conflict resolution UI.
 *
 * Validates: Requirement 10.6
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Minimal React Query wrapper ─────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
}

// ─── Mock @/auth/session ──────────────────────────────────────────────────────
const mockUseAuth = vi.fn()
vi.mock('@/auth/session', () => ({
  useAuth: () => mockUseAuth(),
}))

// ─── Mock dexie-react-hooks ───────────────────────────────────────────────────
const mockUseLiveQuery = vi.fn()
vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: (fn: () => unknown, deps?: unknown[]) => mockUseLiveQuery(fn, deps),
}))

// ─── Mock @/db/local-db ───────────────────────────────────────────────────────
const mockSyncLogUpdate = vi.fn().mockResolvedValue(1)
vi.mock('@/db/local-db', () => ({
  db: {
    syncLog: {
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
      update: (...args: unknown[]) => mockSyncLogUpdate(...args),
    },
  },
}))

// ─── Mock @/db/repositories ──────────────────────────────────────────────────
// useLocalQuery uses repositories — return empty lists to avoid noise
vi.mock('@/db/repositories', () => ({
  clansRepo: { getAll: vi.fn().mockResolvedValue([]), query: vi.fn().mockResolvedValue([]) },
  eldersRepo: { getAll: vi.fn().mockResolvedValue([]), query: vi.fn().mockResolvedValue([]) },
  participantsRepo: { getAll: vi.fn().mockResolvedValue([]), query: vi.fn().mockResolvedValue([]) },
  groupsRepo: { getAll: vi.fn().mockResolvedValue([]), query: vi.fn().mockResolvedValue([]) },
  animalTypesRepo: { getAll: vi.fn().mockResolvedValue([]), query: vi.fn().mockResolvedValue([]) },
  loansRepo: { getAll: vi.fn().mockResolvedValue([]), query: vi.fn().mockResolvedValue([]) },
  receiptsRepo: { getAll: vi.fn().mockResolvedValue([]), query: vi.fn().mockResolvedValue([]) },
  handoversRepo: { getAll: vi.fn().mockResolvedValue([]), query: vi.fn().mockResolvedValue([]) },
  obligationsRepo: { getAll: vi.fn().mockResolvedValue([]), query: vi.fn().mockResolvedValue([]) },
}))

import { PendingActionsPanel } from '@/components/screen/dashboard/PendingActionsPanel'
import type { SyncLogEntry } from '@/db/types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────
function makeConflictEntry(overrides: Partial<SyncLogEntry> = {}): SyncLogEntry {
  return {
    id: 1,
    entityType: 'handovers',
    entityId: 'h-uuid-1',
    action: 'create',
    data: { fromClan: 'clan-a', toClan: 'clan-b' },
    syncStatus: 'conflict',
    createdAt: Date.now(),
    ...overrides,
  }
}

/** Build an elder-like object for the session mock */
function makeElder(role: 'superadmin' | 'validator' | 'participant') {
  return {
    id: 'elder-1',
    name: 'Test User',
    email: 'test@example.com',
    passwordHash: '',
    salt: '',
    role,
    syncStatus: 'local' as const,
    createdAt: 0,
    updatedAt: 0,
  }
}

// ─── Helper: set up mocks and render the panel ───────────────────────────────
function renderPanel(role: 'superadmin' | 'validator' | 'participant', conflicts: SyncLogEntry[]) {
  mockUseAuth.mockReturnValue({ elder: makeElder(role), isLoading: false })

  // useLiveQuery is called with a factory fn; we return the conflicts directly
  // (mirroring what the real hook would do after dexie resolves)
  mockUseLiveQuery.mockImplementation((fn: () => unknown) => {
    // For validator/superadmin the factory returns a live query; return conflicts array
    // For participant the factory returns Promise.resolve([]) → we return []
    const canReview = role === 'validator' || role === 'superadmin'
    return canReview ? conflicts : []
  })

  return render(<PendingActionsPanel />, { wrapper: createWrapper() })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PendingActionsPanel — conflict rows (Req 10.6)', () => {
  beforeEach(() => {
    mockSyncLogUpdate.mockClear()
    mockUseLiveQuery.mockReset()
  })

  // 10.6 — Conflict row renders for syncLog entries with syncStatus === "conflict"
  it('renders a conflict row for each syncLog entry with syncStatus "conflict" (validator)', () => {
    const conflicts = [
      makeConflictEntry({ id: 1, entityType: 'handovers' }),
      makeConflictEntry({ id: 2, entityType: 'loans', entityId: 'l-uuid-2' }),
    ]
    renderPanel('validator', conflicts)

    // Two "Tinjau" buttons — one per conflict row
    const reviewButtons = screen.getAllByRole('button', { name: /tinjau/i })
    expect(reviewButtons).toHaveLength(2)

    // Section heading "Konflik Data (2)" exists — match the paragraph element
    expect(screen.getByText(/Konflik Data \(2\)/i)).toBeInTheDocument()
  })

  it('renders a conflict row when role is "superadmin"', () => {
    renderPanel('superadmin', [makeConflictEntry()])

    expect(screen.getByRole('button', { name: /tinjau/i })).toBeInTheDocument()
  })

  // 10.6 — "Simpan Lokal" and "Gunakan Server" buttons present in resolution modal
  it('opens a resolution modal with "Simpan Lokal" and "Gunakan Server" buttons on Tinjau click', async () => {
    renderPanel('validator', [makeConflictEntry()])

    fireEvent.click(screen.getByRole('button', { name: /tinjau/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Simpan Lokal/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Gunakan Server/i })).toBeInTheDocument()
    })
  })

  it('"Simpan Lokal" calls db.syncLog.update with syncStatus "synced"', async () => {
    const entry = makeConflictEntry({ id: 42 })
    renderPanel('validator', [entry])

    fireEvent.click(screen.getByRole('button', { name: /tinjau/i }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Simpan Lokal/i })).toBeInTheDocument()
    )

    fireEvent.click(screen.getByRole('button', { name: /Simpan Lokal/i }))

    await waitFor(() => {
      expect(mockSyncLogUpdate).toHaveBeenCalledWith(42, { syncStatus: 'synced' })
    })
  })

  it('"Gunakan Server" calls db.syncLog.update with syncStatus "synced"', async () => {
    const entry = makeConflictEntry({ id: 7 })
    renderPanel('validator', [entry])

    fireEvent.click(screen.getByRole('button', { name: /tinjau/i }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Gunakan Server/i })).toBeInTheDocument()
    )

    fireEvent.click(screen.getByRole('button', { name: /Gunakan Server/i }))

    await waitFor(() => {
      expect(mockSyncLogUpdate).toHaveBeenCalledWith(7, { syncStatus: 'synced' })
    })
  })

  // 10.6 — Not rendered for role === "participant"
  it('does NOT render conflict rows for role "participant"', () => {
    renderPanel('participant', [makeConflictEntry()])

    // No "Tinjau" button → no conflict rows
    expect(screen.queryByRole('button', { name: /tinjau/i })).not.toBeInTheDocument()
    // No "Konflik Data (N)" section heading
    expect(screen.queryByText(/Konflik Data \(\d+\)/i)).not.toBeInTheDocument()
  })

  it('renders nothing at all when there are no conflicts and no other pending items (participant)', () => {
    // participant + no conflicts → totalActions = 0 → component returns null
    mockUseAuth.mockReturnValue({ elder: makeElder('participant'), isLoading: false })
    mockUseLiveQuery.mockReturnValue([])

    const { container } = render(<PendingActionsPanel />, { wrapper: createWrapper() })
    expect(container.firstChild).toBeNull()
  })
})
