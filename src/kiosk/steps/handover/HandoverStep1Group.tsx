import { useState, useEffect } from 'react'
import { StepCard } from '@/kiosk/shared/StepCard'
import { GroupPicker } from '@/kiosk/shared/GroupPicker'
import { KioskErrorBanner } from '@/kiosk/shared/KioskErrorBanner'
import { db } from '@/db/local-db'
import type { Group } from '@/db/types'
import type { HandoverKioskDraft } from '@/kiosk/KioskDraft'

interface HandoverStep1GroupProps {
  draft: HandoverKioskDraft
  onNext: (patch: Partial<HandoverKioskDraft>) => Promise<void>
  onBack: () => void
  isLoading?: boolean
}

/**
 * Handover Kiosk Flow — Step 1: Select Group/Event.
 *
 * If no groups exist in IndexedDB, shows an admin message and disables forward
 * navigation (Requirement 8.6).
 *
 * Validates: Requirements 8.1, 8.6, 9.4, 9.5
 */
export function HandoverStep1Group({ draft, onNext, onBack, isLoading }: HandoverStep1GroupProps) {
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
        totalSteps={10}
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
        totalSteps={10}
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
      totalSteps={10}
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
