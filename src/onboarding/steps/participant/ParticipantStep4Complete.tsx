import { StepCard } from '@/kiosk/shared/StepCard'

interface ParticipantStep4CompleteProps {
  onNext: () => void
  onBack: () => void
  /** Called when the participant taps "Selesai". Should set isComplete: true
   *  and navigate to the obligations view. Provided by the parent wizard. */
  completeAll: () => void | Promise<void>
  isLoading?: boolean
}

/**
 * Participant Onboarding — Step 4: Completion.
 *
 * Tapping "Selesai" calls `completeAll()`. Navigation to the participant
 * obligations view is handled by the parent wizard after `completeAll` resolves.
 *
 * Validates: Requirements 4.1, 4.2, 4.6, 4.7
 */
export function ParticipantStep4Complete({
  onNext,
  onBack,
  completeAll,
  isLoading,
}: ParticipantStep4CompleteProps) {
  async function handleComplete() {
    await completeAll()
    onNext()
  }

  return (
    <StepCard
      stepIndex={3}
      totalSteps={4}
      title="Pengaturan Selesai!"
      onNext={handleComplete}
      onBack={onBack}
      nextLabel="Selesai"
      isLoading={isLoading}
    >
      <div className="space-y-4 text-lg">
        <p>
          Selamat! Profil Anda sudah siap. Anda kini dapat menggunakan
          aplikasi <strong>Passura</strong> untuk memantau kewajiban adat
          Anda.
        </p>
        <div className="bg-muted rounded-lg p-4 space-y-2">
          <p className="font-semibold text-foreground">Yang dapat Anda lakukan:</p>
          <ul className="list-disc pl-6 space-y-2 text-foreground">
            <li>
              <strong>Lihat kewajiban</strong> — pantau pinjaman, penerimaan,
              dan penyerahan yang berkaitan dengan Rumpun Keluarga Anda.
            </li>
            <li>
              <strong>Riwayat transaksi</strong> — telusuri catatan adat
              komunitas Anda.
            </li>
          </ul>
        </div>
        <p>
          Tekan <strong>Selesai</strong> untuk membuka halaman kewajiban Anda.
        </p>
      </div>
    </StepCard>
  )
}
