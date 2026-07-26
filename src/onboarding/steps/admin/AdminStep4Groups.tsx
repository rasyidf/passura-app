import { useState, useEffect } from 'react'
import { StepCard } from '@/kiosk/shared/StepCard'
import { KioskErrorBanner } from '@/kiosk/shared/KioskErrorBanner'
import { groupsRepo } from '@/db/repositories'
import type { Group } from '@/db/types'

interface AdminStep4GroupsProps {
  onNext: () => void
  onBack?: () => void
  isLoading?: boolean
}

/**
 * Admin Setup — Step 4: Add Group records.
 * "Lanjut" is disabled when group count === 0.
 *
 * Validates: Requirements 3.2, 3.5, 3.6, 3.10
 */
export function AdminStep4Groups({ onNext, onBack, isLoading }: AdminStep4GroupsProps) {
  const [groups, setGroups] = useState<Group[]>([])
  const [name, setName] = useState('')
  const [eventName, setEventName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [navError, setNavError] = useState<string | null>(null)

  // Load existing groups on mount
  useEffect(() => {
    groupsRepo.getAll().then(setGroups)
  }, [])

  async function handleSave() {
    const trimmedName = name.trim()
    if (!trimmedName) return

    setSaveError(null)
    setIsSaving(true)
    try {
      const created = await groupsRepo.create({
        name: trimmedName,
        eventName: eventName.trim() || undefined,
        members: [],
      })
      setGroups((prev) => [...prev, created])
      setName('')
      setEventName('')
    } catch {
      setSaveError('Gagal menyimpan grup acara. Coba lagi.')
    } finally {
      setIsSaving(false)
    }
  }

  function handleNext() {
    if (groups.length === 0) {
      setNavError('Tambahkan minimal satu grup acara untuk melanjutkan.')
      return
    }
    setNavError(null)
    onNext()
  }

  return (
    <StepCard
      stepIndex={3}
      totalSteps={6}
      title="Tambah Grup Acara"
      onNext={handleNext}
      onBack={onBack}
      nextDisabled={false}
      isLoading={isLoading}
    >
      <div className="space-y-6">
        <p className="text-lg">
          Tambahkan setidaknya satu Grup Acara untuk mengelompokkan transaksi
          dalam upacara adat.
        </p>

        {/* Inline mini-form */}
        <div className="space-y-3 rounded-md border border-input p-4">
          {/* Name */}
          <div className="space-y-1">
            <label htmlFor="group-name" className="text-lg font-medium">
              Nama Grup <span aria-hidden="true" className="text-destructive">*</span>
            </label>
            <input
              id="group-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Rambu Solo 2025"
              className="w-full rounded-md border border-input bg-card text-foreground shadow-xs px-3 py-2 text-lg outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              aria-required="true"
            />
          </div>

          {/* Event Name (optional) */}
          <div className="space-y-1">
            <label htmlFor="group-event-name" className="text-lg font-medium">
              Nama Acara <span className="text-muted-foreground font-normal">(opsional)</span>
            </label>
            <input
              id="group-event-name"
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Contoh: Pemakaman Adat Ne' Baso"
              className="w-full rounded-md border border-input bg-card text-foreground shadow-xs px-3 py-2 text-lg outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            />
          </div>

          {saveError && <KioskErrorBanner message={saveError} />}
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className="kiosk-btn rounded-md bg-primary text-primary-foreground hover:brightness-110 active:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 transition-[filter]"
          >
            {isSaving ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>

        {/* Saved groups list */}
        {groups.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">
              Grup tersimpan ({groups.length})
            </h2>
            <ul className="space-y-2" aria-label="Daftar grup acara">
              {groups.map((group) => (
                <li
                  key={group.id}
                  className="kiosk-card flex items-center justify-between rounded-md border border-input bg-background px-4"
                >
                  <span className="font-medium text-lg">{group.name}</span>
                  {group.eventName && (
                    <span className="text-muted-foreground text-base">{group.eventName}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Navigation error */}
        {navError && <KioskErrorBanner message={navError} />}
      </div>
    </StepCard>
  )
}
