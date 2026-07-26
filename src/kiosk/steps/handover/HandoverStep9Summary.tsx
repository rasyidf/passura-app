import { StepCard } from '@/kiosk/shared/StepCard'
import type { HandoverKioskDraft } from '@/kiosk/KioskDraft'
import { format, parseISO } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

interface HandoverStep9SummaryProps {
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

/**
 * Formats an ISO date string for display in Indonesian locale.
 * Falls back to raw string on parse error.
 */
function formatDate(isoDate: string | null): string {
  if (!isoDate) return '-'
  try {
    return format(parseISO(isoDate), 'd MMMM yyyy', { locale: idLocale })
  } catch {
    return isoDate
  }
}

/**
 * Formats money amount in Indonesian Rupiah locale.
 */
function formatMoney(amount: number | null): string {
  if (amount == null) return '-'
  return `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`
}

/**
 * Handover Kiosk Flow — Step 9: Review summary before confirmation.
 *
 * Displays all draft fields using human-readable names — NO raw UUIDs.
 * Uses stored name fields (groupName, fromClanName, toClanName, animalTypeName)
 * so no additional DB lookups are needed.
 *
 * Validates: Requirements 8.5, Property 10
 */
export function HandoverStep9Summary({ draft, onNext, onBack, isLoading }: HandoverStep9SummaryProps) {
  async function handleNext() {
    await onNext({ currentStep: 9 })
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
      stepIndex={8}
      totalSteps={10}
      title="Ringkasan Penyerahan"
      onNext={handleNext}
      onBack={onBack}
      nextLabel="Konfirmasi"
      isLoading={isLoading}
    >
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
