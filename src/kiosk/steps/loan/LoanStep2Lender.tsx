import { useState, useEffect } from 'react'
import { StepCard } from '@/kiosk/shared/StepCard'
import { ClanPicker } from '@/kiosk/shared/ClanPicker'
import { KioskErrorBanner } from '@/kiosk/shared/KioskErrorBanner'
import { db } from '@/db/local-db'
import type { Clan } from '@/db/types'
import type { LoanKioskDraft } from '@/kiosk/KioskDraft'

interface LoanStep2LenderProps {
  draft: LoanKioskDraft
  onNext: (patch: Partial<LoanKioskDraft>) => Promise<void>
  onBack: () => void
  isLoading?: boolean
}

/**
 * Loan Kiosk Flow — Step 2: Select Lender Clan.
 *
 * If no clans exist in IndexedDB, shows an admin message (Requirement 6.9).
 * Stores the clan name in the draft for use in the summary (Requirement 6.4).
 *
 * Validates: Requirements 6.1, 6.9, 9.4, 9.5
 */
export function LoanStep2Lender({ draft, onNext, onBack, isLoading }: LoanStep2LenderProps) {
  const [clans, setClans] = useState<Clan[]>([])
  const [loadingClans, setLoadingClans] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(draft.lenderClanId)

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

  async function handleNext() {
    if (!selectedId) return
    const selected = clans.find((c) => c.id === selectedId)
    await onNext({
      currentStep: 2,
      lenderClanId: selectedId,
      lenderClanName: selected?.name ?? null,
    })
  }

  if (loadingClans) {
    return (
      <StepCard
        stepIndex={1}
        totalSteps={9}
        title="Pilih Pemberi Pinjaman"
        isLoading={true}
      >
        <p className="text-lg text-muted-foreground">Memuat…</p>
      </StepCard>
    )
  }

  if (clans.length === 0) {
    return (
      <StepCard
        stepIndex={1}
        totalSteps={9}
        title="Pilih Pemberi Pinjaman"
        onBack={onBack}
        isLoading={isLoading}
      >
        <KioskErrorBanner message="Belum ada rumpun keluarga yang terdaftar. Hubungi admin Anda." />
      </StepCard>
    )
  }

  return (
    <StepCard
      stepIndex={1}
      totalSteps={9}
      title="Pilih Pemberi Pinjaman"
      onNext={handleNext}
      onBack={onBack}
      nextDisabled={!selectedId}
      isLoading={isLoading}
    >
      <ClanPicker
        clans={clans}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
    </StepCard>
  )
}
