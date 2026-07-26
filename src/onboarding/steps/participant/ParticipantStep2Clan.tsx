import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/local-db'
import { StepCard } from '@/kiosk/shared/StepCard'
import { ClanPicker } from '@/kiosk/shared/ClanPicker'

interface ParticipantStep2ClanProps {
  onNext: () => void
  onBack: () => void
  onClanSelect?: (clanId: string) => void
  selectedClanId: string | null
  isLoading?: boolean
}

/**
 * Participant Onboarding — Step 2: Select your Clan.
 *
 * Loads clans from IndexedDB via useLiveQuery. Shows ClanPicker when clans
 * exist. When no clans are registered shows a contact-admin message and
 * allows the participant to skip this step.
 *
 * Validates: Requirements 4.2, 4.3, 4.4, 4.7
 */
export function ParticipantStep2Clan({
  onNext,
  onBack,
  onClanSelect,
  selectedClanId,
  isLoading,
}: ParticipantStep2ClanProps) {
  const clans = useLiveQuery(() => db.clans.toArray(), [])

  // useLiveQuery returns undefined while the query is in flight
  const isQueryLoading = clans === undefined
  const hasClans = clans && clans.length > 0
  const noClans = clans !== undefined && clans.length === 0

  return (
    <StepCard
      stepIndex={1}
      totalSteps={4}
      title="Pilih Rumpun Keluarga Anda"
      onNext={onNext}
      onBack={onBack}
      // Require a selection when clans exist; allow skip when none exist
      nextDisabled={hasClans ? selectedClanId === null : false}
      nextLabel={noClans ? 'Lewati' : 'Lanjut'}
      isLoading={isLoading || isQueryLoading}
    >
      <div className="space-y-4 text-lg">
        {isQueryLoading ? (
          <p className="text-muted-foreground">Memuat daftar rumpun…</p>
        ) : noClans ? (
          /* Requirement 4.4 — no rumpun registered */
          <div className="bg-muted rounded-lg p-4 space-y-3">
            <p className="font-semibold text-foreground">
              Belum ada rumpun keluarga yang terdaftar. Hubungi admin Anda.
            </p>
            <p className="text-muted-foreground">
              Anda dapat melewati langkah ini dan melanjutkan pengaturan
              profil. Pilihan rumpun dapat diperbarui nanti oleh admin.
            </p>
          </div>
        ) : (
          /* Rumpun exist — show picker */
          <>
            <p>
              Pilih Rumpun Keluarga (Tongkonan) yang sesuai dengan keanggotaan adat Anda.
            </p>
            <ClanPicker
              clans={clans!}
              selectedId={selectedClanId}
              onSelect={(id) => onClanSelect?.(id)}
            />
          </>
        )}
      </div>
    </StepCard>
  )
}
