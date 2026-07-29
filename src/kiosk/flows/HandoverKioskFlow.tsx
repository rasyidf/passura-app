import { KioskFlowShell, obligationTypeLabel, KioskAssetSummaryRows } from '@/kiosk/shared/KioskFlowShell'
import { HANDOVER_DRAFT_KEY } from '@/kiosk/KioskDraft'
import type { HandoverKioskDraft } from '@/kiosk/KioskDraft'
import { HandoverStep1Group } from '@/kiosk/steps/handover/HandoverStep1Group'
import { HandoverStep2FromClan } from '@/kiosk/steps/handover/HandoverStep2FromClan'
import { HandoverStep3ToClan } from '@/kiosk/steps/handover/HandoverStep3ToClan'
import { HandoverStep4ObligationType } from '@/kiosk/steps/handover/HandoverStep4ObligationType'
import { HandoverStep5AssetType } from '@/kiosk/steps/handover/HandoverStep5AssetType'
import { HandoverStep6Amount } from '@/kiosk/steps/handover/HandoverStep6Amount'
import { HandoverStep7Date } from '@/kiosk/steps/handover/HandoverStep7Date'
import { HandoverStep8Witnesses } from '@/kiosk/steps/handover/HandoverStep8Witnesses'
import { HandoverStep9Summary } from '@/kiosk/steps/handover/HandoverStep9Summary'
import { HandoverStep10Confirm } from '@/kiosk/steps/handover/HandoverStep10Confirm'

// ─── Props ────────────────────────────────────────────────────────────────────

interface HandoverKioskFlowProps {
  onExit: () => void
  onComplete: () => void
}

// ─── Initial draft factory ────────────────────────────────────────────────────

function createInitialDraft(): HandoverKioskDraft {
  const now = Date.now()
  return {
    flowType: 'handover',
    currentStep: 0,
    createdAt: now,
    updatedAt: now,
    groupId: null,
    groupName: null,
    fromClanId: null,
    fromClanName: null,
    toClanId: null,
    toClanName: null,
    obligationType: null,
    assetType: null,
    moneyAmount: null,
    animalTypeId: null,
    animalTypeName: null,
    animalTypePrice: null,
    quantity: null,
    date: null,
    witnessIds: [],
  }
}

// ─── Obligation type label helper ─────────────────────────────────────────────
// (Using shared obligationTypeLabel from KioskFlowShell)

// ─── Success summary rows ─────────────────────────────────────────────────────

function HandoverSuccessSummary({ draft }: { draft: HandoverKioskDraft }) {
  return (
    <>
      {draft.groupName && (
        <p><span className="font-semibold">Grup Acara:</span> {draft.groupName}</p>
      )}
      {draft.fromClanName && (
        <p><span className="font-semibold">Clan Asal:</span> {draft.fromClanName}</p>
      )}
      {draft.toClanName && (
        <p><span className="font-semibold">Clan Tujuan:</span> {draft.toClanName}</p>
      )}
      {draft.obligationType && (
        <p>
          <span className="font-semibold">Jenis Kewajiban:</span>{' '}
          {obligationTypeLabel(draft.obligationType)}
        </p>
      )}
      <KioskAssetSummaryRows
        assetType={draft.assetType}
        moneyAmount={draft.moneyAmount}
        animalTypeName={draft.animalTypeName}
        quantity={draft.quantity}
      />
      {draft.date && (
        <p><span className="font-semibold">Tanggal:</span> {draft.date}</p>
      )}
    </>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Handover Kiosk Flow — orchestrates Steps 1–10 for recording a new handover.
 * All shared shell behaviour (draft persistence, loading screen, success card,
 * exit confirmation) is handled by `KioskFlowShell`.
 *
 * Validates: Requirements 8.1, 8.2, 8.3, 5.4
 */
export function HandoverKioskFlow({ onExit }: HandoverKioskFlowProps) {
  return (
    <KioskFlowShell<HandoverKioskDraft>
      draftKey={HANDOVER_DRAFT_KEY}
      createInitialDraft={createInitialDraft}
      successStep={10}
      successTitle="Penyerahan Berhasil Dicatat!"
      successSubtitle="Catatan penyerahan telah disimpan dan akan disinkronkan saat perangkat terhubung ke internet."
      renderSuccessSummary={(draft) => <HandoverSuccessSummary draft={draft} />}
      renderStep={({ draft, onNext, onBack, isLoading }) => {
        const stepProps = { draft, onNext, onBack, isLoading }
        switch (draft.currentStep) {
          case 0: return <HandoverStep1Group {...stepProps} />
          case 1: return <HandoverStep2FromClan {...stepProps} />
          case 2: return <HandoverStep3ToClan {...stepProps} />
          case 3: return <HandoverStep4ObligationType {...stepProps} />
          case 4: return <HandoverStep5AssetType {...stepProps} />
          case 5: return <HandoverStep6Amount {...stepProps} />
          case 6: return <HandoverStep7Date {...stepProps} />
          case 7: return <HandoverStep8Witnesses {...stepProps} />
          case 8: return <HandoverStep9Summary {...stepProps} />
          case 9: return <HandoverStep10Confirm {...stepProps} />
          default: return <HandoverStep1Group {...stepProps} />
        }
      }}
      onExit={onExit}
    />
  )
}
