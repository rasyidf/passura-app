import { StepCard } from '@/kiosk/shared/StepCard'

interface ParticipantStep3NameProps {
  onNext: () => void
  onBack: () => void
  /** Name looked up by the parent wizard from the participants table.
   *  null means no participant record was found for the logged-in user ID. */
  participantName: string | null
  isLoading?: boolean
}

/**
 * Participant Onboarding — Step 3: Confirm your name.
 *
 * The parent wizard is responsible for querying the participants table by the
 * logged-in user's ID and passing the result as `participantName`. This step
 * displays the name when found, or a contact-admin message when null, allowing
 * the participant to skip.
 *
 * Validates: Requirements 4.2, 4.5, 4.7
 */
export function ParticipantStep3Name({
  onNext,
  onBack,
  participantName,
  isLoading,
}: ParticipantStep3NameProps) {
  const notRegistered = participantName === null

  return (
    <StepCard
      stepIndex={2}
      totalSteps={4}
      title="Konfirmasi Nama Anda"
      onNext={onNext}
      onBack={onBack}
      // Always allow proceeding — skip when not registered, confirm when found
      nextDisabled={false}
      nextLabel={notRegistered ? 'Lewati' : 'Lanjut'}
      isLoading={isLoading}
    >
      <div className="space-y-4 text-lg">
        {notRegistered ? (
          /* Requirement 4.5 — participant not registered */
          <div className="bg-muted rounded-lg p-4 space-y-3">
            <p className="font-semibold text-foreground">
              Nama Anda belum terdaftar. Hubungi admin Anda.
            </p>
            <p className="text-muted-foreground">
              Anda dapat melewati langkah ini. Admin komunitas Anda perlu
              mendaftarkan nama Anda terlebih dahulu sebelum dapat
              dikonfirmasi.
            </p>
          </div>
        ) : (
          /* Name found — show confirmation */
          <div className="space-y-4">
            <p>
              Berikut adalah nama Anda yang terdaftar dalam sistem Passura.
              Pastikan nama ini sudah benar.
            </p>
            <div className="bg-muted rounded-lg p-4">
              <p className="text-muted-foreground text-base mb-1">
                Nama terdaftar:
              </p>
              <p className="text-2xl font-semibold text-foreground">
                {participantName}
              </p>
            </div>
            <p className="text-muted-foreground">
              Jika nama ini tidak sesuai, hubungi admin Anda untuk
              memperbaikinya.
            </p>
          </div>
        )}
      </div>
    </StepCard>
  )
}
