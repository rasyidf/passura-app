import { StepCard } from '@/kiosk/shared/StepCard'

interface ElderStep5CompleteProps {
  onNext: () => void
  onBack: () => void
  isLoading?: boolean
}

/**
 * Elder Onboarding — Step 5: Completion card.
 * The "Lanjut" label is replaced with "Mulai Pakai".
 * The parent wizard (ElderOnboardingWizard) calls `completeAll()` when this
 * step's onNext fires, then dismisses the wizard.
 *
 * Validates: Requirements 2.7, 2.8, 2.10, 2.11
 */
export function ElderStep5Complete({
  onNext,
  onBack,
  isLoading,
}: ElderStep5CompleteProps) {
  return (
    <StepCard
      stepIndex={4}
      totalSteps={5}
      title="Siap Digunakan!"
      onNext={onNext}
      onBack={onBack}
      nextLabel="Mulai Pakai"
      isLoading={isLoading}
    >
      <div className="space-y-4 text-lg">
        <div className="flex flex-col items-center gap-4 py-6">
          <p className="text-center font-semibold text-xl">
            Selamat! Anda sudah siap menggunakan Passura.
          </p>
        </div>

        <p>
          Anda kini memahami peran Anda sebagai Sesepuh dan cara menggunakan
          fitur utama aplikasi ini.
        </p>

        <div className="bg-muted rounded-lg p-4 space-y-2">
          <p className="font-semibold">Ingat:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Gunakan <strong>Mode Kios</strong> untuk mencatat transaksi.</li>
            <li>
              Semua data tersimpan di perangkat Anda, bahkan tanpa internet.
            </li>
            <li>
              Hubungi admin komunitas jika Anda memerlukan bantuan.
            </li>
          </ul>
        </div>

        <p>
          Ketuk <strong>"Mulai Pakai"</strong> untuk mulai menggunakan
          aplikasi.
        </p>
      </div>
    </StepCard>
  )
}
