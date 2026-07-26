import { useState, useEffect } from 'react'
import { StepCard } from '@/kiosk/shared/StepCard'
import { ClanPicker } from '@/kiosk/shared/ClanPicker'
import { KioskErrorBanner } from '@/kiosk/shared/KioskErrorBanner'
import { db } from '@/db/local-db'
import type { Clan } from '@/db/types'
import type { HandoverKioskDraft } from '@/kiosk/KioskDraft'

interface HandoverStep3ToClanProps {
  draft: HandoverKioskDraft
  onNext: (patch: Partial<HandoverKioskDraft>) => Promise<void>
  onBack: () => void
  isLoading?: boolean
}

/**
 * Validates whether toClanId equals fromClanId.
 *
 * Returns an error string when both IDs are the same, empty string otherwise.
 * Validates: Requirement 8.4, Property 7
 */
export function validateSameParty(idA: string | null, idB: string | null): string {
  if (idA && idB && idA === idB) {
    return 'Rumpun asal dan tujuan tidak boleh sama.'
  }
  return ''
}

/**
 * Handover Kiosk Flow — Step 3: Select Destination Clan (toClan).
 *
 * - Excludes the already-selected fromClan from the picker (via `excludeId`).
 * - `validateSameParty` shows "Clan asal dan tujuan tidak boleh sama." and
 *   blocks navigation when both clans match (Requirement 8.4).
 * - Stores clan name for summary display (Property 10 / Requirement 8.5).
 *
 * Validates: Requirements 8.1, 8.4, 9.4, 9.5
 */
export function HandoverStep3ToClan({ draft, onNext, onBack, isLoading }: HandoverStep3ToClanProps) {
  const [clans, setClans] = useState<Clan[]>([])
  const [loadingClans, setLoadingClans] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(draft.toClanId)

  useEffect(() => {
    db.clans.toArray().then((all) => {
      setClans(all)
      setLoadingClans(false)
    })
  }, [])

  const validationError = validateSameParty(draft.fromClanId, selectedId)

  async function handleNext() {
    if (!selectedId || validationError) return
    const selected = clans.find((c) => c.id === selectedId)
    await onNext({
      currentStep: 3,
      toClanId: selectedId,
      toClanName: selected?.name ?? null,
    })
  }

  if (loadingClans) {
    return (
      <StepCard
        stepIndex={2}
        totalSteps={10}
        title="Pilih Rumpun Tujuan"
        isLoading={true}
      >
        <p className="text-lg text-muted-foreground">Memuat…</p>
      </StepCard>
    )
  }

  return (
    <StepCard
      stepIndex={2}
      totalSteps={10}
      title="Pilih Rumpun Tujuan"
      onNext={handleNext}
      onBack={onBack}
      nextDisabled={!selectedId || !!validationError}
      isLoading={isLoading}
    >
      {validationError && <KioskErrorBanner message={validationError} />}
      <ClanPicker
        clans={clans}
        selectedId={selectedId}
        onSelect={setSelectedId}
        excludeId={draft.fromClanId ?? undefined}
      />
    </StepCard>
  )
}
