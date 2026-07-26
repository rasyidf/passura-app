import { useState, useEffect } from 'react'
import { StepCard } from '@/kiosk/shared/StepCard'
import { ClanPicker } from '@/kiosk/shared/ClanPicker'
import { KioskErrorBanner } from '@/kiosk/shared/KioskErrorBanner'
import { db } from '@/db/local-db'
import type { Clan } from '@/db/types'
import type { HandoverKioskDraft } from '@/kiosk/KioskDraft'

interface HandoverStep2FromClanProps {
  draft: HandoverKioskDraft
  onNext: (patch: Partial<HandoverKioskDraft>) => Promise<void>
  onBack: () => void
  isLoading?: boolean
}

/**
 * Handover Kiosk Flow — Step 2: Select Source Clan (fromClan).
 *
 * Stores both the clan ID and human-readable name for the summary step.
 * If no clans exist in IndexedDB, shows an admin message.
 *
 * Validates: Requirements 8.1, 9.4, 9.5
 */
export function HandoverStep2FromClan({ draft, onNext, onBack, isLoading }: HandoverStep2FromClanProps) {
  const [clans, setClans] = useState<Clan[]>([])
  const [loadingClans, setLoadingClans] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(draft.fromClanId)

  useEffect(() => {
    db.clans.toArray().then((all) => {
      setClans(all)
      setLoadingClans(false)
    })
  }, [])

  async function handleNext() {
    if (!selectedId) return
    const selected = clans.find((c) => c.id === selectedId)
    await onNext({
      currentStep: 2,
      fromClanId: selectedId,
      fromClanName: selected?.name ?? null,
    })
  }

  if (loadingClans) {
    return (
      <StepCard
        stepIndex={1}
        totalSteps={10}
        title="Pilih Clan Asal"
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
        totalSteps={10}
        title="Pilih Clan Asal"
        onBack={onBack}
        isLoading={isLoading}
      >
        <KioskErrorBanner message="Belum ada clan yang terdaftar. Hubungi admin Anda." />
      </StepCard>
    )
  }

  return (
    <StepCard
      stepIndex={1}
      totalSteps={10}
      title="Pilih Clan Asal"
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
