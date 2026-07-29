import { useState, useEffect } from 'react'
import { StepCard } from '@/kiosk/shared/StepCard'
import { ClanPicker } from '@/kiosk/shared/ClanPicker'
import { KioskErrorBanner } from '@/kiosk/shared/KioskErrorBanner'
import { db } from '@/db/local-db'
import type { Clan } from '@/db/types'
import type { ReceiptKioskDraft } from '@/kiosk/KioskDraft'

interface ReceiptStep2ReceiverProps {
  draft: ReceiptKioskDraft
  onNext: (patch: Partial<ReceiptKioskDraft>) => Promise<void>
  onBack: () => void
  isLoading?: boolean
}

/**
 * Receipt Kiosk Flow — Step 2: Select Receiving Clan.
 *
 * Stores the clan name in the draft for use in the summary (Requirement 7.5).
 *
 * Validates: Requirements 7.1, 9.4, 9.5
 */
export function ReceiptStep2Receiver({ draft, onNext, onBack, isLoading }: ReceiptStep2ReceiverProps) {
  const [clans, setClans] = useState<Clan[]>([])
  const [loadingClans, setLoadingClans] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(draft.receiverClanId)

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
      receiverClanId: selectedId,
      receiverClanName: selected?.name ?? null,
    })
  }

  if (loadingClans) {
    return (
      <StepCard
        stepIndex={1}
        totalSteps={10}
        title="Pilih Rumpun Penerima"
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
        title="Pilih Rumpun Penerima"
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
      title="Pilih Rumpun Penerima"
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
