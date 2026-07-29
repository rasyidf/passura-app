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
      fromClanId: selectedId,
      fromClanName: selected?.name ?? null,
    })
  }

  if (loadingClans) {
    return (
      <StepCard
        stepIndex={1}
        totalSteps={10}
        title="Pilih Rumpun Asal"
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
        title="Pilih Rumpun Asal"
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
      totalSteps={10}
      title="Pilih Rumpun Asal"
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
