import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useKiosk } from '@/kiosk/KioskContext'
import { KioskOfflineBanner } from '@/kiosk/shared/KioskOfflineBanner'
import { KioskTypeSelect } from '@/kiosk/KioskTypeSelect'
import type { KioskFlow } from '@/kiosk/KioskTypeSelect'
import { LoanKioskFlow } from '@/kiosk/flows/LoanKioskFlow'
import { ReceiptKioskFlow } from '@/kiosk/flows/ReceiptKioskFlow'
import { HandoverKioskFlow } from '@/kiosk/flows/HandoverKioskFlow'

type ActiveFlow = KioskFlow | null

/**
 * KioskOverlay — fixed fullscreen portal rendered over everything at z-60.
 *
 * Requirements: 5.2, 5.5, 10.4
 *
 * - Rendered unconditionally via createPortal into document.body so it always
 *   exists in the DOM, but `pointer-events: none` + `aria-hidden` prevent any
 *   interaction or screen-reader exposure when kiosk mode is inactive.
 * - When active: renders KioskOfflineBanner (manages its own online/offline
 *   state internally), then either the active flow or KioskTypeSelect.
 */
export function KioskOverlay() {
  const { isActive, exit } = useKiosk()
  const [activeFlow, setActiveFlow] = useState<ActiveFlow>(null)

  // Reset active flow when kiosk mode is exited so we land on type-select
  // on the next entry.
  function handleExit() {
    setActiveFlow(null)
    exit()
  }

  const content = (
    <div
      className="kiosk-overlay"
      aria-hidden={!isActive}
      style={isActive ? { pointerEvents: 'auto' } : { pointerEvents: 'none', display: 'none' }}
    >
      {/* Offline indicator — always mounted, shows/hides based on network state */}
      <KioskOfflineBanner />

      {isActive && (
        <>
          {activeFlow === null && (
            <KioskTypeSelect
              setActiveFlow={(flow: ActiveFlow) => setActiveFlow(flow)}
            />
          )}

          {activeFlow === 'loan' && (
            <LoanKioskFlow
              onExit={handleExit}
              onComplete={() => setActiveFlow(null)}
            />
          )}

          {activeFlow === 'receipt' && (
            <ReceiptKioskFlow
              onExit={handleExit}
              onComplete={() => setActiveFlow(null)}
            />
          )}

          {activeFlow === 'handover' && (
            <HandoverKioskFlow
              onExit={handleExit}
              onComplete={() => setActiveFlow(null)}
            />
          )}
        </>
      )}
    </div>
  )

  return createPortal(content, document.body)
}
