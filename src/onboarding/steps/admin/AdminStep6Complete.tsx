import { useState, useEffect } from 'react'
import { StepCard } from '@/kiosk/shared/StepCard'
import { clansRepo, animalTypesRepo, groupsRepo } from '@/db/repositories'

interface AdminStep6CompleteProps {
  onNext: () => void
  onBack?: () => void
  isLoading?: boolean
}

interface SetupSummary {
  clanCount: number
  animalTypeCount: number
  groupCount: number
}

/**
 * Admin Setup — Step 6: Setup complete.
 * Shows a summary card with totals and a "Selesai" button.
 *
 * Validates: Requirements 3.2, 3.8, 3.10
 */
export function AdminStep6Complete({ onNext, onBack, isLoading }: AdminStep6CompleteProps) {
  const [summary, setSummary] = useState<SetupSummary | null>(null)

  useEffect(() => {
    Promise.all([
      clansRepo.count(),
      animalTypesRepo.count(),
      groupsRepo.count(),
    ]).then(([clanCount, animalTypeCount, groupCount]) => {
      setSummary({ clanCount, animalTypeCount, groupCount })
    })
  }, [])

  return (
    <StepCard
      stepIndex={5}
      totalSteps={6}
      title="Pengaturan Selesai!"
      onNext={onNext}
      onBack={onBack}
      nextLabel="Selesai"
      isLoading={isLoading}
    >
      <div className="space-y-6">
        <p className="text-lg">
          Selamat! Tenant Anda telah berhasil dikonfigurasi dan siap digunakan
          oleh anggota komunitas.
        </p>

        {/* Summary card */}
        {summary ? (
          <div className="rounded-md border border-input bg-muted p-6 space-y-4">
            <h2 className="text-lg font-semibold">Ringkasan Pengaturan</h2>
            <dl className="space-y-3">
              <SummaryRow
                label="Clan ditambahkan"
                value={summary.clanCount}
                unit="clan"
              />
              <SummaryRow
                label="Jenis hewan ditambahkan"
                value={summary.animalTypeCount}
                unit="jenis hewan"
              />
              <SummaryRow
                label="Grup acara dibuat"
                value={summary.groupCount}
                unit="grup"
              />
            </dl>
          </div>
        ) : (
          <div className="rounded-md border border-input bg-muted p-6">
            <p className="text-muted-foreground text-lg">Memuat ringkasan…</p>
          </div>
        )}

        <p className="text-lg">
          Anda dapat menambah atau mengubah data kapan saja melalui menu yang
          tersedia di dasbor.
        </p>

        <p className="text-lg">
          Tekan <strong>Selesai</strong> untuk mulai menggunakan Passura.
        </p>
      </div>
    </StepCard>
  )
}

interface SummaryRowProps {
  label: string
  value: number
  unit: string
}

function SummaryRow({ label, value, unit }: SummaryRowProps) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-lg text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold">
        {value} {unit}
      </dd>
    </div>
  )
}
