import { useState, useEffect } from 'react'
import { StepCard } from '@/kiosk/shared/StepCard'
import { GroupPicker } from '@/kiosk/shared/GroupPicker'
import { KioskErrorBanner } from '@/kiosk/shared/KioskErrorBanner'
import { db } from '@/db/local-db'
import type { Group } from '@/db/types'
import type { LoanKioskDraft } from '@/kiosk/KioskDraft'

interface LoanStep1GroupProps {
  draft: LoanKioskDraft
  onNext: (patch: Partial<LoanKioskDraft>) => Promise<void>
  onBack: () => void
  isLoading?: boolean
}

/**
 * Loan Kiosk Flow — Step 1: Select Group/Event.
 *
 * If no groups exist in IndexedDB, shows an admin message and disables forward
 * navigation (Requirement 6.8).
 *
 * Validates: Requirements 6.1, 6.8, 9.4, 9.5
 */
export function LoanStep1Group({ draft, onNext, onBack, isLoading }: LoanStep1GroupProps) {
  const [groups, setGroups] = useState<Group[]>([])
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(draft.groupId)

  useEffect(() => {
    db.groups.toArray().then((all) => {
      setGroups(all)
      setLoadingGroups(false)
    })
  }, [])

  async function handleNext() {
    if (!selectedId) return
    const selected = groups.find((g) => g.id === selectedId)
    await onNext({
      currentStep: 1,
      groupId: selectedId,
      groupName: selected?.name ?? null,
    })
  }

  if (loadingGroups) {
    return (
      <StepCard
        stepIndex={0}
        totalSteps={9}
        title="Pilih Grup Acara"
        isLoading={true}
      >
        <p className="text-lg text-muted-foreground">Memuat…</p>
      </StepCard>
    )
  }

  if (groups.length === 0) {
    return (
      <StepCard
        stepIndex={0}
        totalSteps={9}
        title="Pilih Grup Acara"
        onBack={onBack}
        isLoading={isLoading}
      >
        <KioskErrorBanner message="Belum ada grup acara. Hubungi admin Anda." />
      </StepCard>
    )
  }

  return (
    <StepCard
      stepIndex={0}
      totalSteps={9}
      title="Pilih Grup Acara"
      onNext={handleNext}
      onBack={onBack}
      nextDisabled={!selectedId}
      isLoading={isLoading}
    >
      <GroupPicker
        groups={groups}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
    </StepCard>
  )
}
