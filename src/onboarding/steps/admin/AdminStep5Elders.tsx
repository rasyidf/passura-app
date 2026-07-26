import { useState, useEffect } from 'react'
import { StepCard } from '@/kiosk/shared/StepCard'
import { eldersRepo } from '@/db/repositories'
import type { Elder } from '@/db/types'

interface AdminStep5EldersProps {
  onNext: () => void
  onBack?: () => void
  isLoading?: boolean
}

/**
 * Admin Setup — Step 5: Invite or confirm elder (validator) accounts.
 * This step is optional — no validation required to advance.
 *
 * Validates: Requirements 3.2, 3.8, 3.10
 */
export function AdminStep5Elders({ onNext, onBack, isLoading }: AdminStep5EldersProps) {
  const [elders, setElders] = useState<Elder[]>([])
  const [isLoadingElders, setIsLoadingElders] = useState(true)

  useEffect(() => {
    eldersRepo
      .getAll()
      .then((all) => setElders(all.filter((e) => e.role === 'validator')))
      .finally(() => setIsLoadingElders(false))
  }, [])

  return (
    <StepCard
      stepIndex={4}
      totalSteps={6}
      title="Konfirmasi Akun Sesepuh"
      onNext={onNext}
      onBack={onBack}
      isLoading={isLoading}
    >
      <div className="space-y-6">
        <p className="text-lg">
          Langkah ini bersifat <strong>opsional</strong>. Anda dapat melanjutkan
          tanpa menambahkan sesepuh sekarang.
        </p>
        <p className="text-lg">
          Sesepuh (validator) bertugas memvalidasi setiap transaksi yang dicatat
          dalam sistem. Mereka dapat ditambahkan kapan saja melalui menu
          pengaturan.
        </p>

        {isLoadingElders ? (
          <p className="text-muted-foreground text-lg">Memuat daftar sesepuh…</p>
        ) : elders.length === 0 ? (
          <div className="rounded-md border border-input bg-muted px-4 py-3">
            <p className="text-lg text-muted-foreground">
              Belum ada akun sesepuh yang terdaftar. Tambahkan melalui menu
              Manajemen Pengguna setelah pengaturan selesai.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">
              Sesepuh terdaftar ({elders.length})
            </h2>
            <ul className="space-y-2" aria-label="Daftar sesepuh">
              {elders.map((elder) => (
                <li
                  key={elder.id}
                  className="kiosk-card flex items-center gap-3 rounded-md border border-input bg-background px-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-semibold">
                    {elder.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-lg">{elder.name}</p>
                    <p className="text-muted-foreground text-base">{elder.email}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-muted-foreground text-base">
          Tekan <strong>Lanjut</strong> untuk melanjutkan ke ringkasan pengaturan.
        </p>
      </div>
    </StepCard>
  )
}
