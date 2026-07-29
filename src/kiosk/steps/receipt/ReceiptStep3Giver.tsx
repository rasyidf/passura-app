import { useState, useEffect } from 'react'
import { StepCard } from '@/kiosk/shared/StepCard'
import { ClanPicker } from '@/kiosk/shared/ClanPicker'
import { KioskErrorBanner } from '@/kiosk/shared/KioskErrorBanner'
import { validateSameParty } from '@/onboarding/onboarding-state'
import { db } from '@/db/local-db'
import type { Clan } from '@/db/types'
import type { ReceiptKioskDraft } from '@/kiosk/KioskDraft'

interface ReceiptStep3GiverProps {
  draft: ReceiptKioskDraft
  onNext: (patch: Partial<ReceiptKioskDraft>) => Promise<void>
  onBack: () => void
  isLoading?: boolean
}

/**
 * Receipt Kiosk Flow — Step 3: Select Giving Clan.
 *
 * Excludes the already-selected receiving clan to discourage same-clan selection.
 * Validates that receiver and giver are not identical; shows an error banner if
 * they match (Requirement 7.4).
 * Stores the clan name in the draft for use in the summary (Requirement 7.5).
 *
 * Validates: Requirements 7.1, 7.4, 9.4, 9.5
 */
export function ReceiptStep3Giver({ draft, onNext, onBack, isLoading }: ReceiptStep3GiverProps) {
  const [clans, setClans] = useState<Clan[]>([])
  const [loadingClans, setLoadingClans] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(draft.giverClanId)

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

  // Requirement 7.4: receipt-specific error message when receiver === giver
  const samePartyError =
    selectedId && draft.receiverClanId
      ? validateSameParty(draft.receiverClanId, selectedId)
      : ''
  const validationError = samePartyError
    ? 'Penerima dan pemberi tidak boleh sama.'
    : ''

  async function handleNext() {
    if (!selectedId || validationError) return
    const selected = clans.find((c) => c.id === selectedId)
    await onNext({
      currentStep: 3,
      giverClanId: selectedId,
      giverClanName: selected?.name ?? null,
    })
  }

  if (loadingClans) {
    return (
      <StepCard
        stepIndex={2}
        totalSteps={10}
        title="Pilih Rumpun Pemberi"
        isLoading={true}
      >
        <p className="text-lg text-muted-foreground">Memuat…</p>
      </StepCard>
    )
  }

  if (clans.length === 0) {
    return (
      <StepCard
        stepIndex={2}
        totalSteps={10}
        title="Pilih Rumpun Pemberi"
        onBack={onBack}
        isLoading={isLoading}
      >
        <KioskErrorBanner message="Belum ada rumpun keluarga yang terdaftar. Hubungi admin Anda." />
      </StepCard>
    )
  }

  return (
    <StepCard
      stepIndex={2}
      totalSteps={10}
      title="Pilih Rumpun Pemberi"
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
        excludeId={draft.receiverClanId ?? undefined}
      />
    </StepCard>
  )
}
