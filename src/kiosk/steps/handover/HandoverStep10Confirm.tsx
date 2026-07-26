import { useState } from 'react'
import { StepCard } from '@/kiosk/shared/StepCard'
import { KioskErrorBanner } from '@/kiosk/shared/KioskErrorBanner'
import { handoversRepo } from '@/db/repositories'
import { draftToHandover } from '@/kiosk/KioskDraft'
import type { HandoverKioskDraft } from '@/kiosk/KioskDraft'
import { format, parseISO } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

interface HandoverStep10ConfirmProps {
  draft: HandoverKioskDraft
  onNext: (patch: Partial<HandoverKioskDraft>) => Promise<void>
  onBack: () => void
  isLoading?: boolean
}

const OBLIGATION_LABEL: Record<NonNullable<HandoverKioskDraft['obligationType']>, string> = {
  ritual: 'Ritual',
  social: 'Sosial',
  wedding: 'Pernikahan',
  funeral: 'Pemakaman',
  other: 'Lainnya',
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return '-'
  try {
    return format(parseISO(isoDate), 'd MMMM yyyy', { locale: idLocale })
  } catch {
    return isoDate
  }
}

function formatMoney(amount: number | null): string {
  if (amount == null) return '-'
  return `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`
}

/**
 * Handover Kiosk Flow — Step 10: Confirm & Save.
 *
 * - Calls `handoversRepo.create(draftToHandover(draft))` on confirmation.
 * - On save failure, shows `KioskErrorBanner` with a "Coba Lagi" button that
 *   re-attempts the save without losing draft data (Requirement 8.7).
 * - On success, advances to the success state via `onNext`.
 *
 * Validates: Requirements 8.2, 8.7, 9.4
 */
export function HandoverStep10Confirm({ draft, onNext, onBack, isLoading }: HandoverStep10ConfirmProps) {
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleConfirm() {
    if (saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const handoverPayload = draftToHandover(draft)
      await handoversRepo.create(handoverPayload)
      // Signal success to the flow — pass a sentinel currentStep so the flow
      // can detect completion and transition to the success card.
      await onNext({ currentStep: 10 })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Gagal menyimpan. Coba lagi.'
      setSaveError(`Gagal menyimpan. Data belum hilang. ${message}`)
    } finally {
      setSaving(false)
    }
  }

  const assetDisplay =
    draft.assetType === 'money'
      ? formatMoney(draft.moneyAmount)
      : draft.animalTypeName
        ? `${draft.animalTypeName} × ${draft.quantity ?? '-'} ekor`
        : '-'

  const rows: { label: string; value: string }[] = [
    { label: 'Grup Acara', value: draft.groupName ?? '-' },
    { label: 'Clan Asal', value: draft.fromClanName ?? '-' },
    { label: 'Clan Tujuan', value: draft.toClanName ?? '-' },
    { label: 'Jenis Kewajiban', value: draft.obligationType ? OBLIGATION_LABEL[draft.obligationType] : '-' },
    { label: 'Jenis Aset', value: draft.assetType === 'money' ? 'Uang' : draft.assetType === 'animal' ? 'Hewan' : '-' },
    { label: 'Jumlah', value: assetDisplay },
    { label: 'Tanggal Penyerahan', value: formatDate(draft.date) },
  ]

  return (
    <StepCard
      stepIndex={9}
      totalSteps={10}
      title="Konfirmasi Penyerahan"
      onNext={handleConfirm}
      onBack={onBack}
      nextLabel={saving ? 'Menyimpan…' : 'Konfirmasi & Simpan'}
      nextDisabled={saving}
      isLoading={isLoading || saving}
    >
      {/* Save failure error banner — Requirement 8.7 */}
      {saveError && (
        <div className="mb-4 flex flex-col gap-2">
          <KioskErrorBanner message={saveError} />
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className="kiosk-btn rounded-md bg-destructive text-destructive-foreground hover:brightness-110 active:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 transition-[filter]"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Summary for final review */}
      <dl className="flex flex-col gap-4">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-lg font-medium text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </StepCard>
  )
}
