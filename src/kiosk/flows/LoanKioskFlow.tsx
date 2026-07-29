import { KioskFlowShell, KioskAssetSummaryRows } from '@/kiosk/shared/KioskFlowShell'
import { LOAN_DRAFT_KEY } from '@/kiosk/KioskDraft'
import type { LoanKioskDraft } from '@/kiosk/KioskDraft'
import { LoanStep1Group } from '@/kiosk/steps/loan/LoanStep1Group'
import { LoanStep2Lender } from '@/kiosk/steps/loan/LoanStep2Lender'
import { LoanStep3Borrower } from '@/kiosk/steps/loan/LoanStep3Borrower'
import { LoanStep4Type } from '@/kiosk/steps/loan/LoanStep4Type'
import { LoanStep5Amount } from '@/kiosk/steps/loan/LoanStep5Amount'
import { LoanStep6Date } from '@/kiosk/steps/loan/LoanStep6Date'
import { LoanStep7Witnesses } from '@/kiosk/steps/loan/LoanStep7Witnesses'
import { LoanStep8Summary } from '@/kiosk/steps/loan/LoanStep8Summary'
import { LoanStep9Confirm } from '@/kiosk/steps/loan/LoanStep9Confirm'

// ─── Props ────────────────────────────────────────────────────────────────────

interface LoanKioskFlowProps {
  onExit: () => void
  onComplete: () => void
}

// ─── Initial draft factory ────────────────────────────────────────────────────

function createInitialDraft(): LoanKioskDraft {
  const now = Date.now()
  return {
    flowType: 'loan',
    currentStep: 0,
    createdAt: now,
    updatedAt: now,
    groupId: null,
    groupName: null,
    lenderClanId: null,
    lenderClanName: null,
    borrowerClanId: null,
    borrowerClanName: null,
    loanType: null,
    moneyAmount: null,
    animalTypeId: null,
    animalTypeName: null,
    animalTypePrice: null,
    quantity: null,
    dateIssued: null,
    witnessIds: [],
  }
}

// ─── Success summary rows ─────────────────────────────────────────────────────

function LoanSuccessSummary({ draft }: { draft: LoanKioskDraft }) {
  return (
    <>
      {draft.groupName && (
        <p><span className="font-semibold">Grup Acara:</span> {draft.groupName}</p>
      )}
      {draft.lenderClanName && (
        <p><span className="font-semibold">Pemberi Pinjaman:</span> {draft.lenderClanName}</p>
      )}
      {draft.borrowerClanName && (
        <p><span className="font-semibold">Peminjam:</span> {draft.borrowerClanName}</p>
      )}
      {draft.loanType && (
        <p>
          <span className="font-semibold">Jenis Pinjaman:</span>{' '}
          {draft.loanType === 'money' ? 'Uang' : 'Hewan'}
        </p>
      )}
      <KioskAssetSummaryRows
        assetType={draft.loanType}
        moneyAmount={draft.moneyAmount}
        animalTypeName={draft.animalTypeName}
        quantity={draft.quantity}
      />
      {draft.dateIssued && (
        <p><span className="font-semibold">Tanggal:</span> {draft.dateIssued}</p>
      )}
    </>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Loan Kiosk Flow — orchestrates Steps 1–9 for recording a new loan.
 * All shared shell behaviour (draft persistence, loading screen, success card,
 * exit confirmation) is handled by `KioskFlowShell`.
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 5.4
 */
export function LoanKioskFlow({ onExit }: LoanKioskFlowProps) {
  return (
    <KioskFlowShell<LoanKioskDraft>
      draftKey={LOAN_DRAFT_KEY}
      createInitialDraft={createInitialDraft}
      successStep={9}
      successTitle="Pinjaman Berhasil Dicatat!"
      successSubtitle="Catatan pinjaman telah disimpan dan akan disinkronkan saat perangkat terhubung ke internet."
      renderSuccessSummary={(draft) => <LoanSuccessSummary draft={draft} />}
      renderStep={({ draft, onNext, onBack, isLoading }) => {
        const stepProps = { draft, onNext, onBack, isLoading }
        switch (draft.currentStep) {
          case 0: return <LoanStep1Group {...stepProps} />
          case 1: return <LoanStep2Lender {...stepProps} />
          case 2: return <LoanStep3Borrower {...stepProps} />
          case 3: return <LoanStep4Type {...stepProps} />
          case 4: return <LoanStep5Amount {...stepProps} />
          case 5: return <LoanStep6Date {...stepProps} />
          case 6: return <LoanStep7Witnesses {...stepProps} />
          case 7: return <LoanStep8Summary {...stepProps} />
          case 8: return <LoanStep9Confirm {...stepProps} />
          default: return <LoanStep1Group {...stepProps} />
        }
      }}
      onExit={onExit}
    />
  )
}
