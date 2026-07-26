# Implementation Plan: Onboarding & Kiosk Flow

## Overview

This plan implements four guided flows for the Passura App in TypeScript/React: Elder Onboarding (5 steps), Admin Setup Wizard (6 steps), Participant Onboarding (4 steps), and Kiosk Mode with Loan/Receipt/Handover flows (9–10 steps each). All flows are offline-first using Dexie.js, rendered as React portals over the existing dashboard layout, and built on top of the existing `BaseRepository`, `useAuth`, and `db.appConfig` patterns.

## Tasks

- [x] 1. Foundation — OnboardingState types, pure logic, and Dexie hook
  - [x] 1.1 Create `src/onboarding/onboarding-state.ts` with step constant arrays, `OnboardingState` interface, `getResumeStep`, `shouldShowWizard`, `shouldShowReminderBanner`, and `validateSameParty` pure functions
    - Export `ELDER_STEPS`, `ADMIN_STEPS`, `PARTICIPANT_STEPS` as `readonly` const arrays
    - Implement `getResumeStep<S>(allSteps, completedSteps): number` returning the first incomplete step index, or last index when all complete
    - Implement `shouldShowWizard(state: OnboardingState | null): boolean` returning true when state is null or `isComplete === false`
    - Implement `shouldShowReminderBanner(state: OnboardingState): boolean` — true iff `skipped === true && skipSessionCount <= 7 && reminderDismissed === false`
    - Implement `validateSameParty(idA: string, idB: string): string` — returns non-empty Indonesian error string when `idA === idB`, empty string otherwise
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.7, 6.7, 7.4, 8.4_

  - [x]* 1.2 Write property tests for pure onboarding-state functions (fast-check)
    - **Property 1: Wizard resume finds the first incomplete step** — `fc.shuffledSubarray(ELDER_STEPS)` generates completed subsets; assert `getResumeStep` returns the first non-completed index (or last when all complete)
    - **Property 3: Completed state hides wizard** — `fc.record({ isComplete: fc.constant(true), completedSteps: fc.array(fc.string()), ...})` confirms `shouldShowWizard` returns false
    - **Property 4: Reminder banner visibility** — `fc.integer({min:0,max:20})` and `fc.boolean()` confirm `shouldShowReminderBanner` returns true iff `skipSessionCount <= 7 && !reminderDismissed`
    - **Property 7: Same-clan validation** — `fc.string({minLength:21,maxLength:21})` generates clan IDs; assert `validateSameParty(id, id)` returns non-empty string and `validateSameParty(idA, idB)` where `idA !== idB` returns empty string
    - Test file: `src/onboarding/__tests__/properties.test.ts`, minimum 100 runs each
    - _Requirements: 1.3, 1.5, 1.7, 6.7, 7.4, 8.4_

  - [x] 1.3 Create `src/onboarding/useOnboardingState.ts` React hook
    - On mount, load `OnboardingState` from `db.appConfig.get("onboarding-state")` for the given `userId`; handle missing record (return null)
    - Expose `state`, `isLoading`, `completeStep(stepId)`, `completeAll()`, `skip()`, `dismissReminder()`, `incrementSessionCount()` — all write mutations go through a single serialized `db.appConfig.put` path
    - `completeStep` must write to IndexedDB before the returned promise resolves (Property 2 guarantee)
    - Handle IndexedDB write errors by returning a rejected promise so the caller can surface an error UI
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 1.7, 1.8_


- [x] 2. Shared kiosk UI components
  - [x] 2.1 Create `src/kiosk/shared/StepCard.tsx`
    - Implement `StepCardProps` interface from the design (stepIndex, totalSteps, title, children, onNext, onBack, nextLabel, backLabel, nextDisabled, isLoading)
    - Render a `role="main"` wrapper; update `document.title` to the step title on each render
    - Progress indicator text "Langkah N dari M" with `aria-label="Langkah N dari M"` and minimum `text-lg` size; meets Property 6 (every StepCard has progress indicator)
    - "Lanjut" button uses `.kiosk-btn` class (min 48×48px); "Kembali" button uses same class; `nextDisabled` disables the forward button
    - Maximum one primary action (forward) per card; apply `.kiosk-h1` to title (min 24px)
    - _Requirements: 2.3, 2.4, 9.1, 9.2, 9.3, 9.4_

  - [x] 2.2 Create `src/kiosk/shared/StepProgressBar.tsx`
    - Render dot indicators (minimum 12×12px each) as a complementary visual to the text counter inside `StepCard`
    - Active dot uses `ring-2 ring-primary`; all dots use `role="img"` with `aria-label` for screen readers
    - _Requirements: 9.4_

  - [x] 2.3 Create `src/kiosk/shared/ClanPicker.tsx`
    - Implement `ClanPickerProps` (clans, selectedId, onSelect, excludeId)
    - Render a `role="listbox"` containing named list items with `role="option"` and `aria-selected`
    - Each item minimum 64px height, minimum `text-lg`, focus ring `ring-2 ring-primary`; no raw `<select>` element
    - Filter out `excludeId` from rendered options to prevent same-clan selection
    - _Requirements: 9.5, 9.6_


  - [x] 2.4 Create `src/kiosk/shared/AnimalTypePicker.tsx` and `src/kiosk/shared/GroupPicker.tsx`
    - `AnimalTypePicker`: same listbox/option pattern as `ClanPicker`; filters by `category === "buffalo" | "pig"` when rendered from kiosk loan/receipt/handover step 5
    - `GroupPicker`: same pattern; shows group `name` and optional `eventName` in item secondary line
    - Both enforce 64px minimum item height and `text-lg` minimum font size
    - _Requirements: 6.5, 9.5_

  - [x] 2.5 Create `src/kiosk/shared/MoneyInput.tsx` and `src/kiosk/shared/QuantityInput.tsx`
    - `MoneyInput`: large numeric input labelled "Rp", min=1, max=999999999, `.kiosk-btn` sizing, integer-only via `inputMode="numeric"`; displays formatted `id-ID` locale value
    - `QuantityInput`: large numeric input for animal quantities, min=1, max=99
    - Both components expose `value`, `onChange`, `disabled` props
    - _Requirements: 6.5, 6.6, 7.7, 9.1, 9.2_

  - [x] 2.6 Create `src/kiosk/shared/DatePicker.tsx`
    - Wrap shadcn/ui `Calendar` in a touch-friendly sheet or popover; default to today's date
    - Expose `value: string | null` (ISO date) and `onChange: (date: string) => void`
    - Ensure the trigger button meets 48×48px minimum touch target
    - _Requirements: 6.1, 7.1, 8.1, 9.2_

  - [x] 2.7 Create `src/kiosk/shared/KioskErrorBanner.tsx` and `src/kiosk/shared/KioskOfflineBanner.tsx`
    - `KioskErrorBanner`: full-width banner, `role="alert"`, `aria-live="assertive"`, destructive color with WCAG AA contrast; receives `message: string`
    - `KioskOfflineBanner`: subscribes to `navigator.onLine` via `window.addEventListener("online"|"offline")`; renders sticky banner with `role="status"` and text "Offline — data disimpan lokal" when offline; returns null when online
    - _Requirements: 9.7, 9.8, 10.4_


  - [x] 2.8 Add kiosk CSS utility classes to `src/styles.css`
    - Add `.kiosk-btn` (min-height 48px, min-width 48px, padding 12px 24px, font-size 18px)
    - Add `.kiosk-card` (min-height 64px, padding 16px, font-size 18px)
    - Add `.kiosk-h1` (font-size 24px, font-weight 600, line-height 1.3)
    - Add `.kiosk-overlay` (position fixed, inset 0, z-index 60, background var(--background))
    - _Requirements: 9.1, 9.2, 9.4_

  - [x]* 2.9 Write unit tests for shared kiosk components (Vitest + Testing Library)
    - `StepCard`: renders progress text "Langkah 1 dari 5", disables forward button when `nextDisabled`, calls `onNext` on click — aligns with Property 6
    - `ClanPicker`: renders all clans except `excludeId`, marks selected item `aria-selected="true"`
    - `KioskOfflineBanner`: shows banner when `navigator.onLine` is false, hides when online (mock `navigator.onLine` and dispatch events)
    - `MoneyInput`: rejects values below 1 and above 999999999
    - Test file: `src/kiosk/__tests__/shared.test.tsx`
    - _Requirements: 9.2, 9.4, 9.5, 10.4_

- [x] 3. Checkpoint — shared components complete
  - Ensure all tests pass, ask the user if questions arise.


- [x] 4. Elder Onboarding Wizard (5 steps)
  - [x] 4.1 Create Elder step components in `src/onboarding/steps/elder/`
    - `ElderStep1Welcome.tsx` — welcome card with role explanation text in Bahasa Indonesia, `text-lg` minimum, "Lanjut" button
    - `ElderStep2Clans.tsx` — explanation of Clan concept with illustrative text
    - `ElderStep3Transactions.tsx` — explanation of Loan, Receipt, Handover concepts
    - `ElderStep4KioskIntro.tsx` — explanation of how to open Kiosk Mode, with visual cue
    - `ElderStep5Complete.tsx` — completion card with "Mulai Pakai" button (calls `completeAll()` then dismisses wizard)
    - All steps use `StepCard` with correct `stepIndex`/`totalSteps` (0–4 out of 5)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.7, 2.8, 2.10, 2.11_

  - [x] 4.2 Create `src/onboarding/wizards/ElderOnboardingWizard.tsx`
    - Receive `state: OnboardingState | null` as prop; compute initial step via `getResumeStep(ELDER_STEPS, state?.completedSteps ?? [])`
    - On each "Lanjut": call `completeStep(stepId)` and await resolution BEFORE incrementing local step index; on error show error state within StepCard with "Coba Lagi" / "Tutup" buttons (Requirement 1.8)
    - Back navigation does not modify `completedSteps`
    - "Lanjut" on Step 5 calls `completeAll()` which sets `isComplete: true`
    - _Requirements: 2.4, 2.5, 2.6, 2.8, 2.9, 1.8_

  - [x]* 4.3 Write unit tests for ElderOnboardingWizard (Vitest)
    - Renders correct step on resume from partial completedSteps
    - "Lanjut" is disabled during pending IndexedDB write
    - "Kembali" navigates back without changing completedSteps
    - IndexedDB failure shows error state with retry button
    - Test file: `src/onboarding/__tests__/elder.test.tsx`
    - _Requirements: 2.5, 2.6, 1.8_


- [x] 5. Admin Setup Wizard (6 steps)
  - [x] 5.1 Create Admin step components in `src/onboarding/steps/admin/`
    - `AdminStep1Welcome.tsx` — setup overview card, "Lanjut" to proceed
    - `AdminStep2Clans.tsx` — inline mini-form to add Clan records (name, region, lineageHead optional); calls `clansRepo.create(...)` on "Simpan"; displays saved clans in a list; "Lanjut" disabled if clan count === 0 with error "Tambahkan minimal satu clan untuk melanjutkan."
    - `AdminStep3AnimalTypes.tsx` — inline form for AnimalType (name, category, breed, quality, price); calls `animalTypesRepo.create(...)`; "Lanjut" disabled if count === 0 with error "Tambahkan minimal satu jenis hewan untuk melanjutkan."
    - `AdminStep4Groups.tsx` — inline form for Group (name, eventName optional, members); calls `groupsRepo.create(...)`; "Lanjut" disabled if count === 0 with error "Tambahkan minimal satu grup acara untuk melanjutkan."
    - `AdminStep5Elders.tsx` — optional step, shows existing elders list; no validation required to advance
    - `AdminStep6Complete.tsx` — summary card showing total clans, animal types, groups created; "Selesai" button calls `completeAll()`
    - All steps use `StepCard`, save to IndexedDB via repos before showing confirmation (Requirement 3.6)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.8, 3.10_

  - [x] 5.2 Create `src/onboarding/wizards/AdminSetupWizard.tsx`
    - Resume logic identical to Elder wizard using `ADMIN_STEPS` and `getResumeStep`
    - Persist completed step via `completeStep` before advancing; handle IndexedDB errors with retry/dismiss (Requirement 1.8)
    - _Requirements: 3.1, 3.7, 3.8, 1.8_

  - [x]* 5.3 Write property test for Admin entity saves (fast-check)
    - **Property 5: Admin save writes syncStatus "pending"** — `fc.record({name: fc.string({minLength:1}), region: fc.option(fc.string()), ...})` generates Clan data; call `clansRepo.create(data)` via `fake-indexeddb`; assert resulting entity has `syncStatus === "local"` and a `syncLog` entry exists with `syncStatus === "pending"` and `action === "create"`
    - Same pattern for `AnimalType` and `Group`
    - Test file: `src/onboarding/__tests__/properties.test.ts`, minimum 100 runs
    - _Requirements: 3.6_

  - [x]* 5.4 Write unit tests for AdminSetupWizard (Vitest)
    - Step 2: "Lanjut" blocked when no clan saved; unblocked after saving one
    - Step 3: same for animal types; Step 4: same for groups
    - Resume from partial `completedSteps` lands on correct step
    - Save confirmation appears after "Simpan" click
    - Test file: `src/onboarding/__tests__/admin.test.tsx`
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7_


- [x] 6. Participant Onboarding Flow (4 steps)
  - [x] 6.1 Create Participant step components in `src/onboarding/steps/participant/`
    - `ParticipantStep1Welcome.tsx` — welcome and role explanation in Bahasa Indonesia
    - `ParticipantStep2Clan.tsx` — show `ClanPicker` loaded from `useLocalQuery("clans")`; on select, call `eldersRepo.update(elder.id, { clan: selectedClanId })`; if no clans exist, show "Belum ada clan yang terdaftar. Hubungi admin Anda." with skip option
    - `ParticipantStep3Name.tsx` — query `participants` table by logged-in user ID; show name if found; if not found, show "Nama Anda belum terdaftar. Hubungi admin Anda." with skip option
    - `ParticipantStep4Complete.tsx` — "Selesai" button calls `completeAll()`; navigates to participant obligations view via `router.navigate`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x] 6.2 Create `src/onboarding/wizards/ParticipantOnboardingWizard.tsx`
    - Use `PARTICIPANT_STEPS` and `getResumeStep`; same persist-before-advance pattern
    - _Requirements: 4.1, 4.2, 1.5_

  - [x]* 6.3 Write unit tests for ParticipantOnboardingWizard (Vitest)
    - Step 2 no-clans case shows skip message without clan picker
    - Step 3 no-participant case shows skip message
    - Clan selection updates elder record in IndexedDB
    - Test file: `src/onboarding/__tests__/participant.test.tsx`
    - _Requirements: 4.3, 4.4, 4.5_


- [x] 7. OnboardingGuard + portal overlay integration
  - [x] 7.1 Create `src/onboarding/OnboardingGuard.tsx`
    - Call `useOnboardingState(elder.id)` from `useAuth()`; show `LoadingScreen` while `isLoading`
    - Implement `getWizardForRole(role)` mapping: `"validator"` → `ElderOnboardingWizard`, `"superadmin"|"admin"` → `AdminSetupWizard`, `"participant"` → `ParticipantOnboardingWizard`
    - When `shouldShowWizard(state)` is true, mount wizard via `createPortal(wizardElement, document.body)` at `z-50`; otherwise render only `{children}`
    - Call `incrementSessionCount()` on each mount when `state.skipped === true && !state.isComplete` (for the session-count reminder logic)
    - _Requirements: 1.3, 1.4, 1.5, 2.1, 3.1, 4.1_

  - [x] 7.2 Update `src/routes/dashboard/route.tsx` to wrap with `KioskProvider` and `OnboardingGuard`
    - Wrap `AuthGuard > KioskProvider > OnboardingGuard > div.flex > Sidebar + main > Outlet`
    - Mount `<KioskOverlay />` inside `KioskProvider` but outside `OnboardingGuard`
    - No new URL routes needed
    - _Requirements: 1.3, 1.4, 5.5_

  - [x]* 7.3 Write unit tests for OnboardingGuard (Vitest)
    - Role `"validator"` mounts `ElderOnboardingWizard` portal when wizard needed
    - Role `"admin"` mounts `AdminSetupWizard`
    - When `isComplete === true`, no wizard portal is mounted
    - `incrementSessionCount` is called when state is skipped
    - Test file: `src/onboarding/__tests__/guard.test.tsx`
    - _Requirements: 1.3, 1.4, 2.1, 3.1, 4.1_


- [x] 8. KioskContext, KioskDraft types, and useKioskDraft hook
  - [x] 8.1 Create `src/kiosk/KioskContext.tsx`
    - Define `KioskContextValue` interface (`isActive`, `enter`, `exit`) and `KioskProvider` component with local state
    - `enter()` sets `isActive = true`; `exit()` sets `isActive = false`
    - Export `useKiosk()` hook with proper error boundary
    - _Requirements: 5.1, 5.2, 5.4, 5.5_

  - [x] 8.2 Create `src/kiosk/KioskDraft.ts` with `KioskDraftBase`, `LoanKioskDraft`, `ReceiptKioskDraft`, `HandoverKioskDraft` interfaces and the three draft-to-entity pure mapping functions
    - `draftToLoan(draft: LoanKioskDraft): Omit<Loan, "id"|"syncStatus"|"createdAt"|"updatedAt">` — maps `groupId` → `group`, group `name` → `event`, sets `status: "requested"`, maps loanType; assert `lenderClanId !== borrowerClanId` inside (throw on violation)
    - `draftToReceipt(draft: ReceiptKioskDraft): Omit<Receipt, ...>` — sets `settlementStatus: "pending"`
    - `draftToHandover(draft: HandoverKioskDraft): Omit<Handover, ...>`
    - Export draft key constants: `LOAN_DRAFT_KEY`, `RECEIPT_DRAFT_KEY`, `HANDOVER_DRAFT_KEY`
    - _Requirements: 6.2, 7.2, 8.2, 10.1_

  - [x] 8.3 Create `src/kiosk/useKioskDraft.ts`
    - Generic hook `useKioskDraft<D extends KioskDraftBase>(draftKey)` returning `{ draft, updateDraft, clearDraft, isLoading }`
    - `updateDraft(patch)` writes merged state to `db.appConfig` BEFORE the returned promise resolves (Property 9 guarantee)
    - `clearDraft()` calls `db.appConfig.delete(draftKey)`
    - On mount, load existing draft from `db.appConfig.get(draftKey)`
    - _Requirements: 5.6, 5.7, 10.1_

  - [x]* 8.4 Write property test for draft persistence (fast-check)
    - **Property 9: Kiosk draft persisted after every step advance** — `fc.nat({max:8})` generates step indices; call `updateDraft({currentStep: N+1, groupId: fc.string()})` with fake-indexeddb; read `db.appConfig.get(LOAN_DRAFT_KEY)` and assert `currentStep === N+1` and field values match
    - Test file: `src/kiosk/__tests__/properties.test.ts`, minimum 100 runs
    - _Requirements: 5.7_


- [x] 9. KioskOverlay and type-selection screen
  - [x] 9.1 Create `src/kiosk/KioskOverlay.tsx`
    - Fixed fullscreen `div.kiosk-overlay` rendered via `createPortal(..., document.body)` at `z-60`
    - When `isActive === false`: `pointer-events: none`, hidden (or `display: none` for screen readers)
    - When `isActive === true`: `pointer-events: auto`, renders `KioskOfflineBanner` at top, then the active flow or `KioskTypeSelect`
    - Render `<KioskOfflineBanner />` unconditionally inside the overlay (shows/hides based on network state internally)
    - _Requirements: 5.2, 5.5, 10.4_

  - [x] 9.2 Create `src/kiosk/KioskTypeSelect.tsx`
    - Show three `.kiosk-card` items: "Catat Pinjaman", "Catat Penerimaan", "Catat Penyerahan"
    - Each card minimum 44×44px touch target; call `setActiveFlow("loan"|"receipt"|"handover")` on tap
    - If any draft exists in `appConfig`, show a resume prompt ("Lanjutkan" / "Buang") using `useKioskDraft` checks for all three keys; "Buang" calls `clearDraft()` on the matching key
    - "Keluar Kios" button calls `kiosk.exit()` — visible at all times
    - _Requirements: 5.2, 5.3, 5.4, 5.6_

  - [x]* 9.3 Write unit tests for KioskOverlay and KioskTypeSelect (Vitest)
    - Overlay renders nothing (pointer-events:none) when `isActive === false`
    - Type select shows resume prompt when draft exists, discard removes it
    - Each card tap sets correct flow type
    - Test file: `src/kiosk/__tests__/overlay.test.tsx`
    - _Requirements: 5.2, 5.6_

- [x] 10. Checkpoint — overlay and context wired
  - Ensure all tests pass, ask the user if questions arise.


- [x] 11. Loan Kiosk Flow (9 steps)
  - [x] 11.1 Create loan step components in `src/kiosk/steps/loan/`
    - `LoanStep1Group.tsx` — `GroupPicker` from `useLocalQuery("groups")`; if empty, show "Belum ada grup acara. Hubungi admin Anda." and disable forward
    - `LoanStep2Lender.tsx` — `ClanPicker` from `useLocalQuery("clans")`; if empty, show "Belum ada clan yang terdaftar. Hubungi admin Anda."
    - `LoanStep3Borrower.tsx` — `ClanPicker` with `excludeId={draft.lenderClanId}`; calls `validateSameParty` on advance; shows error banner and blocks navigation if same clan
    - `LoanStep4Type.tsx` — two `.kiosk-card` buttons: "Uang" and "Hewan"
    - `LoanStep5Amount.tsx` — renders `MoneyInput` when `loanType === "money"`; renders `AnimalTypePicker` + `QuantityInput` (max 99) when `"animal"`
    - `LoanStep6Date.tsx` — `DatePicker` defaulting to today
    - `LoanStep7Witnesses.tsx` — optional multi-select from elders list (checkboxes, skip allowed)
    - `LoanStep8Summary.tsx` — renders all human-readable labels (group name, clan names, loan type label, amount/animal name, date); NO raw UUIDs anywhere in the rendered output (Property 10)
    - `LoanStep9Confirm.tsx` — "Konfirmasi" button; on press calls `loansRepo.create(draftToLoan(draft))`; on success calls `clearDraft()` and transitions to success card; on failure shows `KioskErrorBanner` with "Coba Lagi" (Property 8)
    - All steps call `updateDraft({ currentStep: N+1, ...stepData })` before advancing (Property 9)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

  - [x] 11.2 Create `src/kiosk/flows/LoanKioskFlow.tsx`
    - Manage `currentStep` from `draft.currentStep`; render the appropriate step component
    - Success card after Step 9 confirm: "Catat Lagi" resets draft to step 0; "Kembali ke Dasbor" calls `kiosk.exit()`
    - "Keluar Kios" button with confirmation prompt on every step
    - _Requirements: 6.2, 6.3, 5.4_

  - [x]* 11.3 Write property tests for Loan Kiosk Flow (fast-check)
    - **Property 8: Confirm writes entity + syncLog** — generate valid `LoanKioskDraft` with `fc.record({...})`; call `draftToLoan` then `loansRepo.create()`; assert entity has `syncStatus === "local"` and `syncLog` has matching entry with `action: "create"` and `syncStatus: "pending"` (fake-indexeddb)
    - **Property 10: Summary renders no raw UUIDs** — generate drafts with UUID-format IDs; render `LoanStep8Summary`; assert no UUID/nanoid pattern in `container.textContent`
    - Test file: `src/kiosk/__tests__/properties.test.ts`, minimum 100 runs each
    - _Requirements: 6.2, 6.4, 10.1_

  - [x]* 11.4 Write unit tests for Loan Kiosk Flow (Vitest)
    - Same-clan error on Step 3 blocks "Lanjut"
    - Empty groups on Step 1 shows admin message
    - "Uang" path hides animal picker; "Hewan" path hides money input
    - Save failure shows error banner without losing draft
    - Test file: `src/kiosk/__tests__/loan.test.tsx`
    - _Requirements: 6.7, 6.8, 6.9_


- [x] 12. Receipt Kiosk Flow (10 steps)
  - [x] 12.1 Create receipt step components in `src/kiosk/steps/receipt/`
    - `ReceiptStep1Group.tsx` — `GroupPicker`; empty guard identical to Loan Step 1
    - `ReceiptStep2Receiver.tsx` — `ClanPicker` for receiving clan
    - `ReceiptStep3Giver.tsx` — `ClanPicker` with `excludeId={draft.receiverClanId}`; `validateSameParty` on advance shows "Penerima dan pemberi tidak boleh sama." and blocks navigation
    - `ReceiptStep4ObligationType.tsx` — five `.kiosk-card` options: Ritual, Sosial, Pernikahan, Pemakaman, Lainnya
    - `ReceiptStep5AssetType.tsx` — two cards: "Uang" / "Hewan"
    - `ReceiptStep6Amount.tsx` — `MoneyInput` or `AnimalTypePicker` + `QuantityInput` based on assetType
    - `ReceiptStep7Date.tsx` — `DatePicker` defaulting to today
    - `ReceiptStep8Witnesses.tsx` — optional witnesses multi-select
    - `ReceiptStep9Summary.tsx` — human-readable summary; no raw UUIDs (Property 10)
    - `ReceiptStep10Confirm.tsx` — calls `receiptsRepo.create(draftToReceipt(draft))`; error handling via `KioskErrorBanner`
    - All steps persist draft via `updateDraft` before advancing
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 12.2 Create `src/kiosk/flows/ReceiptKioskFlow.tsx`
    - Same pattern as `LoanKioskFlow`; success card with "Catat Lagi" / "Kembali ke Dasbor"
    - _Requirements: 7.2, 7.3, 5.4_

  - [x]* 12.3 Write unit tests for Receipt Kiosk Flow (Vitest)
    - Same-clan error on Step 3 blocks "Lanjut" and shows correct Indonesian message
    - Money amount validation enforces min/max
    - Success card shows two exactly-correct action buttons
    - Test file: `src/kiosk/__tests__/receipt.test.tsx`
    - _Requirements: 7.4, 7.7_


- [x] 13. Handover Kiosk Flow (10 steps)
  - [x] 13.1 Create handover step components in `src/kiosk/steps/handover/`
    - `HandoverStep1Group.tsx` — `GroupPicker`; empty guard
    - `HandoverStep2FromClan.tsx` — `ClanPicker` for source clan
    - `HandoverStep3ToClan.tsx` — `ClanPicker` with `excludeId={draft.fromClanId}`; `validateSameParty` shows "Clan asal dan tujuan tidak boleh sama." and blocks navigation
    - `HandoverStep4ObligationType.tsx` — five `.kiosk-card` obligation types
    - `HandoverStep5AssetType.tsx` — "Uang" / "Hewan" cards
    - `HandoverStep6Amount.tsx` — `MoneyInput` or `AnimalTypePicker` + `QuantityInput`
    - `HandoverStep7Date.tsx` — `DatePicker` defaulting to today
    - `HandoverStep8Witnesses.tsx` — optional witnesses
    - `HandoverStep9Summary.tsx` — human-readable summary; no raw UUIDs (Property 10)
    - `HandoverStep10Confirm.tsx` — calls `handoversRepo.create(draftToHandover(draft))`; save failure shows `KioskErrorBanner` with retry; success transitions to success card
    - All steps persist draft via `updateDraft` before advancing
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [x] 13.2 Create `src/kiosk/flows/HandoverKioskFlow.tsx`
    - Same pattern as Loan and Receipt flows
    - _Requirements: 8.2, 8.3, 5.4_

  - [x]* 13.3 Write unit tests for Handover Kiosk Flow (Vitest)
    - Same-clan error shows correct message; retry on confirm failure preserves draft in IndexedDB
    - Test file: `src/kiosk/__tests__/handover.test.tsx`
    - _Requirements: 8.4, 8.7_

- [x] 14. Checkpoint — all three kiosk flows complete
  - Ensure all tests pass, ask the user if questions arise.


- [x] 15. Dashboard banners and "Mode Kios" entry button
  - [x] 15.1 Create `src/components/layout/SetupCompletenessBanner.tsx`
    - Use `useLocalQuery` for clans, animalTypes, and groups; compute `setupComplete = clanCount > 0 && animalTypeCount > 0 && groupCount > 0`
    - Only render for `elder.role === "superadmin" || "admin"`
    - Non-dismissible banner shown when `!setupComplete`; contains a link/button that calls `kiosk.enterAdminSetup()` (or re-opens `AdminSetupWizard` by clearing `isComplete` in onboarding state)
    - _Requirements: 3.9_

  - [x] 15.2 Create `src/components/layout/OnboardingReminderBanner.tsx`
    - Call `shouldShowReminderBanner(state)` from `useOnboardingState`; show dismissible banner with "Mulai Panduan" and "Tutup Selamanya" actions
    - "Mulai Panduan" clears `isComplete` in onboarding state and re-opens the wizard portal; "Tutup Selamanya" calls `dismissReminder()`
    - _Requirements: 1.7_

  - [x] 15.3 Add "Mode Kios" button to `src/components/screen/DashboardScreen.tsx`
    - Show for `elder.role === "validator" || "admin"` only
    - Button calls `kiosk.enter()`; style with `.kiosk-btn` class for size compliance
    - Render `<SetupCompletenessBanner />` and `<OnboardingReminderBanner />` at top of dashboard
    - _Requirements: 5.1, 3.9, 1.7_

  - [x]* 15.4 Write unit tests for banners (Vitest)
    - `SetupCompletenessBanner`: shown when any count is 0, hidden when all ≥ 1; not rendered for `role === "validator"`
    - `OnboardingReminderBanner`: shown when `skipSessionCount <= 7 && !reminderDismissed`; "Tutup Selamanya" calls `dismissReminder()`
    - Test file: `src/components/__tests__/banners.test.tsx`
    - _Requirements: 3.9, 1.7_


- [x] 16. PendingActionsPanel conflict resolution extension
  - [x] 16.1 Extend `src/components/screen/dashboard/PendingActionsPanel.tsx` to handle conflict entries
    - Query `db.syncLog.where("syncStatus").equals("conflict").toArray()` in addition to existing queries
    - For each conflict entry, render a row with label "Konflik data — perlu ditinjau" and a "Tinjau" button
    - "Tinjau" opens a modal (use existing `dialog.tsx`) showing the conflicting entity fields with two resolution actions: "Simpan Lokal" (keep local, mark as `synced`) and "Gunakan Server" (overwrite local with server version, mark as `synced`)
    - Only show to users with `role === "validator"` or `role === "admin"`
    - _Requirements: 10.5, 10.6_

  - [x]* 16.2 Write unit tests for conflict resolution UI (Vitest)
    - Conflict row renders for syncLog entries with `syncStatus === "conflict"`
    - "Simpan Lokal" and "Gunakan Server" buttons present in resolution modal
    - Not rendered for `role === "participant"`
    - Test file: `src/components/__tests__/pending-actions.test.tsx`
    - _Requirements: 10.6_


- [x] 17. Integration tests with fake-indexeddb
  - [x]* 17.1 Write integration tests for the full onboarding state lifecycle (Vitest + fake-indexeddb)
    - Full Elder Onboarding: call `completeStep` for each ELDER_STEPS step in sequence; assert `state.isComplete === true` and `completedAt` is set after last step
    - Resume from partial state: write `{completedSteps: ["elder-welcome", "elder-clans"], isComplete: false}` to fake DB; mount `ElderOnboardingWizard`; assert renders step index 2 (`"elder-transactions"`)
    - Skip flow: call `skip()`; assert `isComplete: true`, `skipped: true`, `completedSteps: []`
    - Test file: `src/onboarding/__tests__/integration.test.ts`
    - _Requirements: 1.1, 1.2, 1.5, 1.6_

  - [x]* 17.2 Write integration tests for full kiosk save flows (Vitest + fake-indexeddb)
    - Full Loan flow: populate fake DB with group and clans; simulate all 9 steps via `updateDraft` calls; call `loansRepo.create(draftToLoan(draft))`; assert loan in `db.loans` with correct fields and syncLog entry
    - Full Receipt and Handover saves: same pattern
    - Draft resume: write partial draft to appConfig; mount `KioskTypeSelect`; assert resume prompt appears
    - Draft discard: choose "Buang"; assert draft key deleted from appConfig
    - Test file: `src/kiosk/__tests__/integration.test.ts`
    - _Requirements: 5.6, 5.7, 6.2, 7.2, 8.2, 10.1_

- [x] 18. Accessibility audit (axe-core snapshots)
  - [x]* 18.1 Write axe-core snapshot tests for wizard and kiosk components (Vitest + @axe-core/react)
    - Run `axe()` on rendered `StepCard` at step 0 and step 4 of Elder flow; assert zero violations
    - Run `axe()` on `ClanPicker` with sample data; assert zero violations
    - Run `axe()` on `KioskErrorBanner` with a test message; assert zero violations
    - Run `axe()` on `LoanStep8Summary` with a complete draft; assert zero violations
    - Test file: `src/kiosk/__tests__/a11y.test.tsx`
    - _Requirements: 9.7, 9.8_

- [x] 19. Final checkpoint — all tests pass
  - Ensure all tests pass, ask the user if questions arise.


## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP delivery
- Each task references specific requirements for full traceability
- Property-based tests use **fast-check** with a minimum of 100 iterations per property
- Integration tests use **fake-indexeddb** (already a Dexie-compatible in-memory replacement) — no real browser required
- Accessibility tests use **@axe-core/react** inside Vitest/jsdom
- Checkpoints in tasks 3, 10, 14, and 19 act as integration gates to catch regressions early
- All user-facing text is in Bahasa Indonesia per requirements 2.11, 4.7, 9.9
- The `draftToLoan`, `draftToReceipt`, and `draftToHandover` pure functions are the single source of truth for mapping UI state to entity schema — test these thoroughly before wiring to the confirm steps


## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.8"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7"] },
    { "id": 2, "tasks": ["2.9", "8.1", "8.2"] },
    { "id": 3, "tasks": ["4.1", "5.1", "6.1", "8.3", "9.1", "9.2"] },
    { "id": 4, "tasks": ["4.2", "5.2", "6.2", "8.4", "9.3"] },
    { "id": 5, "tasks": ["4.3", "5.3", "5.4", "6.3", "7.1", "11.1", "12.1", "13.1"] },
    { "id": 6, "tasks": ["7.2", "11.2", "12.2", "13.2"] },
    { "id": 7, "tasks": ["7.3", "11.3", "11.4", "12.3", "13.3", "15.1", "15.2"] },
    { "id": 8, "tasks": ["15.3", "16.1"] },
    { "id": 9, "tasks": ["15.4", "16.2", "17.1", "17.2"] },
    { "id": 10, "tasks": ["18.1"] }
  ]
}
```
