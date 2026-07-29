import { useState, useEffect } from 'react'
import { StepCard } from '@/kiosk/shared/StepCard'
import { ClanPicker } from '@/kiosk/shared/ClanPicker'
import { KioskErrorBanner } from '@/kiosk/shared/KioskErrorBanner'
import { validateSameParty } from '@/onboarding/onboarding-state'
import { db } from '@/db/local-db'
import type { Clan } from '@/db/types'
import type { LoanKioskDraft } from '@/kiosk/KioskDraft'

interface LoanStep3BorrowerProps {
  draft: LoanKioskDraft
  onNext: (patch: Partial<LoanKioskDraft>) => Promise<void>
  onBack: () => void
  isLoading?: boolean
}

/**
 * Loan Kiosk Flow — Step 3: Select Borrower Clan.
 *
 * Excludes the lender clan from selection (excludeId prop on ClanPicker).
 * Calls validateSameParty on advance — shows error and blocks navigation
 * if the selected clan matches the lender clan (Requirement 6.7).
 * Stores the clan name in the draft for use in the summary (Requirement 6.4).
 *
 * Validates: Requirements 6.1, 6.7, 9.4, 9.5
 */
export function LoanStep3Borrower({ draft, onNext, onBack, isLoading }: LoanStep3BorrowerProps) {
  const [clans, setClans] = useState<Clan[]>([])
  const [loadingClans, setLoadingClans] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(draft.borrowerClanId)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadClans = async () => {
      const all = await db.clans.toArray()
      // If a group was selected, only show clans that are members of that group
      if (draft.groupId) {
        const group = await db.groups.get(draft.groupId)
        const memberIds = new Set(group?.members ?? [])
        setClans(memberIds.size > 0 ? all.filter((c) => memberIds.has(c.id)) : all)
      } else {
        setClans(all)
      }
      setLoadingClans(false)
    }
    loadClans()
  }, [draft.groupId])

  function handleSelect(id: string) {
    setSelectedId(id)
    // Clear the error when user picks a new clan
    if (error) setError(null)
  }

  async function handleNext() {
    if (!selectedId) return

    // Validate same-party rule (Requirement 6.7)
    const validationError = draft.lenderClanId
      ? validateSameParty(draft.lenderClanId, selectedId)
      : ''

    if (validationError) {
      setError(validationError)
      return
    }

    const selected = clans.find((c) => c.id === selectedId)
    await onNext({
      currentStep: 3,
      borrowerClanId: selectedId,
      borrowerClanName: selected?.name ?? null,
    })
  }

  if (loadingClans) {
    return (
      <StepCard
        stepIndex={2}
        totalSteps={9}
        title="Pilih Peminjam"
        isLoading={true}
      >
        <p className="text-lg text-muted-foreground">Memuat…</p>
      </StepCard>
    )
  }

  return (
    <StepCard
      stepIndex={2}
      totalSteps={9}
      title="Pilih Peminjam"
      onNext={handleNext}
      onBack={onBack}
      nextDisabled={!selectedId || !!error}
      isLoading={isLoading}
    >
      <div className="space-y-4">
        {error && <KioskErrorBanner message={error} />}
        <ClanPicker
          clans={clans}
          selectedId={selectedId}
          onSelect={handleSelect}
          excludeId={draft.lenderClanId ?? undefined}
        />
      </div>
    </StepCard>
  )
}
