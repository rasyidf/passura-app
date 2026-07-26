# Requirements Document

## Introduction

Passura App ("Buku Besar Adat Digital") is an offline-first digital ledger for Toraja traditional ceremonies (Rambu Solo / Rambu Tuka). The existing CRUD DataTable screens are designed for power users but are too complex for elders (community validators who are often not tech-savvy) and for first-time admins and participants.

This feature introduces four guided onboarding and kiosk-mode flows:

1. **Elder Onboarding** — a one-time walkthrough for elders on their first login, orienting them to the app and their role.
2. **Admin Onboarding** — a step-by-step setup wizard for tenant admins to configure their community data (clans, animal types, groups) before the app is usable.
3. **Participant Onboarding** — a first-login profile-completion flow for regular community members.
4. **Kiosk Mode (Lend/Payment Flow)** — a permanent, simplified card-based wizard that replaces DataTable screens for elders when recording loans, receipts, and handovers.

All flows must work completely offline (Dexie.js/IndexedDB), persist progress across reloads, and respect the existing role hierarchy (`superadmin`, `admin`, `elder`, `participant`).

---

## Glossary

- **Onboarding_Wizard**: A multi-step, full-screen or modal guided flow shown once to a user after their first login or after tenant setup is required.
- **Kiosk_Mode**: A permanent, simplified card-based UI mode for elders that replaces the DataTable/form interface for recording transactions. Accessible at any time from the dashboard.
- **Kiosk_Flow**: A single guided wizard session within Kiosk_Mode for one transaction type (loan, receipt, or handover).
- **Onboarding_State**: A persisted record in IndexedDB (Dexie) stored as an `appConfig` entry with key `"onboarding-state"`. Fields: `userId`, `role`, `completedSteps: string[]`, `isComplete: boolean`, `completedAt: number | null`.
- **Step_Card**: A single full-screen card within a wizard, showing one question or action at a time with large touch-friendly controls.
- **Elder**: An authenticated user with `role === "validator"` in the `elders` table. Community leader and loan validator.
- **Admin**: An authenticated user with `role === "superadmin"` or `role === "admin"` in the `elders` table. Responsible for initial tenant configuration.
- **Participant**: An authenticated user with `role === "participant"`. Regular community member.
- **Clan** (Tongkonan): A household/lineage unit within the community. Entity in `clans` table.
- **Group**: An event group scoping a ceremony. Entity in `groups` table.
- **AnimalType**: A categorised livestock type (buffalo or pig) with quality and price. Entity in `animal_types` table.
- **Loan**: A record of an animal or money obligation between two clans. Entity in `loans` table.
- **Receipt**: A record of a donation/asset received by a clan from another. Entity in `receipts` table.
- **Handover**: A record of an asset formally handed from one clan to another. Entity in `handovers` table.
- **Sync_Status**: A field on every entity: `"local"`, `"pending"`, `"synced"`, or `"conflict"`.
- **Setup_Completeness**: A computed boolean — `true` when the tenant has at least one Clan, one AnimalType, and one Group recorded in IndexedDB.

---

## Requirements

### Requirement 1: Onboarding State Tracking

**User Story:** As any authenticated user, I want the app to remember whether I have completed onboarding, so that I am not shown the wizard again on subsequent logins.

#### Acceptance Criteria

1. WHEN an authenticated user completes a step in their role's Onboarding_Wizard, THE Onboarding_Wizard SHALL persist the step identifier to `completedSteps` in Onboarding_State in IndexedDB under the key `"onboarding-state"` before advancing to the next step.
2. WHEN a user completes all steps of their role's Onboarding_Wizard, THE Onboarding_Wizard SHALL set `isComplete: true` and record `completedAt` as the current Unix timestamp in Onboarding_State.
3. WHEN an authenticated user opens the dashboard and their Onboarding_State has `isComplete: true`, THE Onboarding_Wizard SHALL NOT be displayed.
4. WHEN an authenticated user opens the dashboard and no Onboarding_State record exists for that user, THE Onboarding_Wizard SHALL display the appropriate wizard for that user's role.
5. WHEN an authenticated user opens the dashboard and their Onboarding_State has `isComplete: false`, THE Onboarding_Wizard SHALL resume the wizard from the first step not present in `completedSteps`.
6. THE Onboarding_Wizard SHALL allow a user to skip the entire wizard, setting `isComplete: true` immediately with `completedSteps: []`.
7. WHEN a user skips the Onboarding_Wizard, THE Onboarding_Wizard SHALL display a dismissible reminder banner on the dashboard. THE banner SHALL appear for 7 subsequent login sessions offering to restart the wizard. WHEN the user dismisses the banner, THE Onboarding_Wizard SHALL permanently suppress it for that user.
8. IF IndexedDB is unavailable when writing Onboarding_State, THEN THE Onboarding_Wizard SHALL display an error message and allow the user to retry the write or dismiss the wizard. WHEN the user retries, THE Onboarding_Wizard SHALL re-attempt the write. WHEN the user dismisses, THE Onboarding_Wizard SHALL close without modifying any previously stored data.

---

### Requirement 2: Elder Onboarding Flow

**User Story:** As an elder (validator), I want a guided walkthrough of the app on my first login, so that I understand my role and can find the Kiosk Mode without needing technical help.

#### Acceptance Criteria

1. WHEN an elder logs in and no Onboarding_State record exists for that user, OR the record has `isComplete` not equal to `true`, THE Onboarding_Wizard SHALL display the Elder Onboarding Flow consisting of exactly 5 Step_Cards.
2. THE Elder_Onboarding_Flow SHALL present Step_Cards in the following sequence: (1) Welcome & role explanation, (2) What is a Clan, (3) What is a Loan/Receipt/Handover, (4) How to open Kiosk Mode, (5) Completion confirmation.
3. WHILE an elder is viewing any Step_Card, THE Onboarding_Wizard SHALL display a progress indicator showing the current step number and total steps (e.g., "2 / 5") in text of at least 18px.
4. WHEN an elder taps the "Lanjut" (Next) button on a Step_Card, THE Onboarding_Wizard SHALL advance to the next Step_Card.
5. WHEN an elder taps the "Lanjut" button on a Step_Card, THE Onboarding_Wizard SHALL persist the completed step identifier to `completedSteps` in Onboarding_State before rendering the next Step_Card.
6. WHEN an elder taps the "Kembali" (Back) button on Step_Card 2 or later, THE Onboarding_Wizard SHALL navigate to the previous Step_Card without modifying `completedSteps`.
7. WHEN an elder reaches Step_Card 5 (completion), THE Onboarding_Wizard SHALL display a "Mulai Pakai" (Start Using) button.
8. WHEN an elder taps "Mulai Pakai", THE Onboarding_Wizard SHALL set `isComplete: true` in Onboarding_State and navigate to the dashboard.
9. WHEN an elder opens the Elder Onboarding Flow and their Onboarding_State has `completedSteps` containing one or more step identifiers, THE Onboarding_Wizard SHALL resume at the first step not present in `completedSteps`.
10. THE Elder_Onboarding_Flow SHALL use a minimum font size of 18px and touch-target sizes of at least 48×48px for all interactive controls.
11. THE Elder_Onboarding_Flow SHALL be displayed in Bahasa Indonesia.

---

### Requirement 3: Admin Onboarding (Tenant Setup) Flow

**User Story:** As a tenant admin, I want a step-by-step setup wizard on my first login, so that I can configure clans, animal types, and groups before other users can use the app.

#### Acceptance Criteria

1. WHEN a user with `role === "superadmin"` or `role === "admin"` logs in and no Onboarding_State record exists for that user, THE Onboarding_Wizard SHALL display the Admin_Setup_Flow.
2. THE Admin_Setup_Flow SHALL present the following ordered steps: (1) Welcome & setup overview, (2) Add Clans (minimum 1 required), (3) Add Animal Types (minimum 1 required), (4) Create a Group/Event (minimum 1 required), (5) Invite or confirm elder accounts (optional — no validation required to advance), (6) Setup complete.
3. WHEN an admin taps the forward-navigation control on Step 2 and fewer than 1 clan has been entered in that session, THE Admin_Setup_Flow SHALL prevent navigation to Step 3 and display: "Tambahkan minimal satu clan untuk melanjutkan."
4. WHEN an admin taps the forward-navigation control on Step 3 and fewer than 1 animal type has been entered in that session, THE Admin_Setup_Flow SHALL prevent navigation to Step 4 and display: "Tambahkan minimal satu jenis hewan untuk melanjutkan."
5. WHEN an admin taps the forward-navigation control on Step 4 and fewer than 1 group has been entered in that session, THE Admin_Setup_Flow SHALL prevent navigation to Step 5 and display: "Tambahkan minimal satu grup acara untuk melanjutkan."
6. WHEN an admin taps "Simpan" (Save) within a step, THE Admin_Setup_Flow SHALL write the created entity (Clan, AnimalType, or Group) to IndexedDB with `syncStatus: "pending"` before displaying the step's save confirmation to the admin.
7. WHEN an admin navigates away from the Admin_Setup_Flow before completion — whether via the browser back button, closing the tab, or session expiry — THE Onboarding_Wizard SHALL persist the completed steps to Onboarding_State. WHEN that admin logs in again, THE Onboarding_Wizard SHALL resume from the step with the lowest number not present in `completedSteps`.
8. WHEN an admin completes all required steps, THE Admin_Setup_Flow SHALL set `isComplete: true` in Onboarding_State and display a summary card showing the total number of clans, animal types, and groups created.
9. WHILE Setup_Completeness is `false`, THE Passura_App SHALL display a non-dismissible banner on the dashboard for users with `role === "superadmin"` or `role === "admin"`. THE banner SHALL contain text indicating tenant setup is incomplete and SHALL include a link to re-open the Admin_Setup_Flow.
10. THE Admin_Setup_Flow SHALL be fully operable without an internet connection, including entering data, saving entities to IndexedDB, and navigating between steps.

---

### Requirement 4: Participant (Member) Onboarding Flow

**User Story:** As a participant, I want a guided profile-completion flow on my first login, so that I can associate myself with my clan and understand how to view my obligations.

#### Acceptance Criteria

1. WHEN a participant logs in and no Onboarding_State record exists for that user, THE Onboarding_Wizard SHALL display the Participant_Onboarding_Flow consisting of exactly 4 Step_Cards.
2. THE Participant_Onboarding_Flow SHALL present Step_Cards in the following sequence: (1) Welcome & role explanation, (2) Select your Clan from a searchable list of existing Clans, (3) Confirm your name as it appears in the Participants table, (4) Completion — view your obligations summary.
3. WHEN a participant selects a Clan in Step 2, THE Participant_Onboarding_Flow SHALL update the `clan` field on the logged-in Elder record in IndexedDB with `syncStatus: "pending"`.
4. IF no Clans exist in IndexedDB when the participant reaches Step 2, THEN THE Participant_Onboarding_Flow SHALL display: "Belum ada clan yang terdaftar. Hubungi admin Anda." and allow the participant to skip Step 2 without modifying the `clan` field.
5. WHEN a participant reaches Step 3 and no Participant record in IndexedDB matches the logged-in user's ID, THE Participant_Onboarding_Flow SHALL display: "Nama Anda belum terdaftar. Hubungi admin Anda." and allow the participant to skip Step 3.
6. WHEN a participant taps "Selesai" (Done) on Step 4, THE Participant_Onboarding_Flow SHALL set `isComplete: true` in Onboarding_State and navigate to the participant's personal obligations view.
7. THE Participant_Onboarding_Flow SHALL be displayed in Bahasa Indonesia.

---

### Requirement 5: Kiosk Mode — Entry and Session Management

**User Story:** As an elder, I want a clearly visible Kiosk Mode entry point on the dashboard, so that I can start recording a transaction without navigating through menus or tables.

#### Acceptance Criteria

1. IF the authenticated user has `role === "validator"` or `role === "admin"`, THEN THE Passura_App SHALL display a prominent "Mode Kios" (Kiosk Mode) button on the dashboard.
2. WHEN an elder taps the "Mode Kios" button, THE Kiosk_Mode SHALL display a transaction-type selection screen with three cards, each with a minimum touch target of 44×44px: "Catat Pinjaman" (Loan), "Catat Penerimaan" (Receipt), "Catat Penyerahan" (Handover).
3. WHEN an elder selects a transaction type, THE Kiosk_Mode SHALL launch the corresponding Kiosk_Flow.
4. WHEN a Kiosk_Flow is active, THE Kiosk_Mode SHALL display a persistent "Keluar Kios" (Exit Kiosk) button. WHEN an elder taps "Keluar Kios", THE Kiosk_Mode SHALL display a confirmation prompt with two options: "Batal" (cancel, returns to flow) and "Keluar" (exit, discards the in-progress entry and navigates to the transaction-type selection screen).
5. WHILE Kiosk_Mode is active, THE Kiosk_Mode SHALL display in fullscreen, covering the sidebar and top navigation.
6. WHEN an elder enters Kiosk_Mode and an incomplete Kiosk_Flow draft exists in IndexedDB, THE Kiosk_Mode SHALL offer to resume or discard the draft. WHEN the elder chooses resume, THE Kiosk_Flow SHALL restore the wizard at the last saved step. WHEN the elder chooses discard, THE Kiosk_Mode SHALL delete the draft from IndexedDB and display the transaction-type selection screen.
7. THE Kiosk_Mode SHALL persist draft Kiosk_Flow data to IndexedDB after each step so that in-progress entries survive page reloads.

---

### Requirement 6: Kiosk Flow — Record a Loan

**User Story:** As an elder, I want a guided step-by-step flow to record a new loan between two clans, so that I can do it without seeing a complex form.

#### Acceptance Criteria

1. THE Loan_Kiosk_Flow SHALL present Step_Cards in the following sequence: (1) Select Group/Event, (2) Select Lender Clan, (3) Select Borrower Clan, (4) Select loan type (Uang / Hewan), (5) Enter amount or select animal type and quantity, (6) Select date issued (default: today), (7) Select witnesses (optional), (8) Review summary, (9) Confirm & save.
2. WHEN an elder taps "Konfirmasi" on Step 9, THE Loan_Kiosk_Flow SHALL write the Loan to IndexedDB with `status: "requested"`, `loanType` set to `"money"` when "Uang" was selected or `"animal"` when "Hewan" was selected, the selected Group's `name` written to the `event` field, the selected Group's `id` written to the `group` field, and `syncStatus: "pending"`.
3. WHEN the Loan is saved successfully, THE Loan_Kiosk_Flow SHALL display a full-screen success card. THE success card SHALL show the loan summary and exactly two actions: "Catat Lagi" (which resets the flow to Step 1) and "Kembali ke Dasbor" (which navigates to the dashboard).
4. THE Loan_Kiosk_Flow SHALL display on Step 8 a summary that includes at minimum: Group name, Lender Clan name, Borrower Clan name, loan type label ("Uang" or "Hewan"), amount or animal type name and quantity, and issue date. THE summary SHALL NOT contain raw UUIDs or technical identifiers.
5. WHEN an elder selects "Hewan" as loan type on Step 4, THE Loan_Kiosk_Flow SHALL display on Step 5 only AnimalType records with `category === "buffalo"` or `category === "pig"` as selectable options, with a maximum quantity input of 99.
6. WHEN an elder selects "Uang" as loan type on Step 4, THE Loan_Kiosk_Flow SHALL display on Step 5 a large numeric input labelled "Rp" with a minimum value of 1 and a maximum value of 999,999,999.
7. IF the Lender Clan and Borrower Clan are the same value, THEN THE Loan_Kiosk_Flow SHALL display the validation error "Pemberi dan peminjam tidak boleh sama." and prevent navigation to Step 4.
8. IF no Groups exist in IndexedDB when the elder reaches Step 1, THEN THE Loan_Kiosk_Flow SHALL display: "Belum ada grup acara. Hubungi admin Anda." and prevent continuation.
9. IF no Clans exist in IndexedDB when the elder reaches Step 2, THEN THE Loan_Kiosk_Flow SHALL display: "Belum ada clan yang terdaftar. Hubungi admin Anda." and prevent continuation.

---

### Requirement 7: Kiosk Flow — Record a Receipt

**User Story:** As an elder, I want a guided step-by-step flow to record a donation received by a clan, so that receipts are captured accurately without using the full form.

#### Acceptance Criteria

1. THE Receipt_Kiosk_Flow SHALL present Step_Cards in the following sequence: (1) Select Group/Event, (2) Select Receiving Clan, (3) Select Giving Clan, (4) Select obligation type (Ritual / Sosial / Pernikahan / Pemakaman / Lainnya), (5) Select asset type (Uang / Hewan), (6) Enter amount or select animal type and quantity, (7) Select date received (default: today), (8) Select witnesses (optional), (9) Review summary, (10) Confirm & save.
2. WHEN an elder taps "Konfirmasi" on Step 10, THE Receipt_Kiosk_Flow SHALL write the Receipt to IndexedDB with `settlementStatus: "pending"` and `syncStatus: "pending"`.
3. WHEN the Receipt is saved successfully, THE Receipt_Kiosk_Flow SHALL display a full-screen success card. THE success card SHALL show the receipt summary and exactly two actions: "Catat Lagi" (which resets the flow to Step 1) and "Kembali ke Dasbor" (which navigates to the dashboard).
4. IF the Receiving Clan and Giving Clan are the same value, THEN THE Receipt_Kiosk_Flow SHALL display a validation error in a highlighted banner above the step content: "Penerima dan pemberi tidak boleh sama." and prevent navigation to Step 4.
5. THE Receipt_Kiosk_Flow SHALL display on Step 9 a summary that includes at minimum: Group name, Receiving Clan name, Giving Clan name, obligation type label, asset type, amount or animal type name and quantity, and date received. THE summary SHALL NOT contain raw UUIDs.
6. IF no Groups exist in IndexedDB when the elder reaches Step 1, THEN THE Receipt_Kiosk_Flow SHALL display: "Belum ada grup acara. Hubungi admin Anda." and prevent continuation.
7. WHEN an elder selects "Uang" as asset type on Step 5, THE Receipt_Kiosk_Flow SHALL display on Step 6 a large numeric input labelled "Rp" with a minimum value of 1 and a maximum value of 999,999,999.

---

### Requirement 8: Kiosk Flow — Record a Handover

**User Story:** As an elder, I want a guided step-by-step flow to record a formal asset handover between two clans, so that handovers are logged correctly.

#### Acceptance Criteria

1. THE Handover_Kiosk_Flow SHALL present Step_Cards in the following sequence: (1) Select Group/Event, (2) Select Source Clan (fromClan), (3) Select Destination Clan (toClan), (4) Select obligation type (Ritual / Sosial / Pernikahan / Pemakaman / Lainnya), (5) Select asset type (Uang / Hewan), (6) Enter amount or select animal type and quantity, (7) Select handover date (default: today), (8) Select witnesses (optional), (9) Review summary, (10) Confirm & save.
2. WHEN an elder taps "Konfirmasi" on Step 10, THE Handover_Kiosk_Flow SHALL write the Handover to IndexedDB with `syncStatus: "pending"`.
3. WHEN the Handover is saved successfully, THE Handover_Kiosk_Flow SHALL display a full-screen success card. THE success card SHALL show the handover summary and exactly two actions: "Catat Lagi" (which resets the flow to Step 1) and "Kembali ke Dasbor" (which navigates to the dashboard).
4. IF the Source Clan and Destination Clan are the same value, THEN THE Handover_Kiosk_Flow SHALL display a validation error: "Clan asal dan tujuan tidak boleh sama." and prevent navigation to Step 4.
5. THE Handover_Kiosk_Flow SHALL display on Step 9 a summary that includes at minimum: Group name, Source Clan name, Destination Clan name, obligation type label, asset type, amount or animal type name and quantity, and handover date. THE summary SHALL NOT contain raw UUIDs.
6. IF no Groups exist in IndexedDB when the elder reaches Step 1, THEN THE Handover_Kiosk_Flow SHALL display: "Belum ada grup acara. Hubungi admin Anda." and prevent continuation.
7. IF a write to IndexedDB fails when the elder taps "Konfirmasi" on Step 10, THEN THE Handover_Kiosk_Flow SHALL display an error message and offer the elder a retry option without losing the entered data.

---

### Requirement 9: Kiosk Mode — Accessibility and Usability Standards

**User Story:** As an elder who is not tech-savvy, I want the Kiosk Mode interface to be clear, large, and unambiguous, so that I can use it confidently without assistance.

#### Acceptance Criteria

1. THE Kiosk_Mode SHALL use a minimum font size of 18px for all body text and 24px for headings within any Step_Card.
2. THE Kiosk_Mode SHALL use touch targets of at least 48×48px for all interactive elements, including buttons, selectors, list items, navigation controls, and dismiss/close controls.
3. THE Kiosk_Mode SHALL display no more than one primary action (the single forward-progression control) per Step_Card at a time. Back-navigation and dismiss controls are not considered primary actions and may also be present.
4. THE Kiosk_Mode SHALL show the current step number and total steps on every Step_Card. WHEN a text label is used (e.g., "Langkah 3 dari 9"), it SHALL have a minimum font size of 18px. WHEN dot indicators are used, each dot SHALL be at least 12×12px.
5. WHEN a clan or animal type selection is required, THE Kiosk_Mode SHALL display entities as named cards or list items with a minimum height of 64px per item, never as a raw `<select>` element.
6. THE Kiosk_Mode SHALL be fully operable using touch-only input, with no functionality dependent on hover state.
7. THE Kiosk_Mode SHALL use color contrast ratios meeting WCAG 2.1 Level AA: a minimum of 4.5:1 for normal text (below 18px or 14px bold) and a minimum of 3:1 for large text (18px or above, or 14px bold or above).
8. WHEN an error occurs within a Kiosk_Flow step, THE Kiosk_Mode SHALL display the error message in a banner that spans the full width of the Step_Card and has a background with at least 3:1 contrast against the Step_Card background. THE error text SHALL meet the contrast requirements in criterion 7.
9. THE Kiosk_Mode SHALL display all labels, messages, and prompts in Bahasa Indonesia.

---

### Requirement 10: Offline-First Data Integrity for Kiosk Flows

**User Story:** As an elder recording a transaction in an area with no internet, I want the app to save my entry locally and sync later, so that no data is lost.

#### Acceptance Criteria

1. WHEN a Kiosk_Flow saves a transaction (Loan, Receipt, or Handover), THE Passura_App SHALL write the entity to IndexedDB with `syncStatus: "pending"` and SHALL create a corresponding syncLog entry with `action: "create"` and `syncStatus: "pending"`, regardless of network connectivity.
2. THE Kiosk_Mode SHALL NOT require an active internet connection to function at any step.
3. WHEN the device regains network connectivity, THE Sync_Layer SHALL automatically trigger a sync push that includes all entities with `syncStatus: "pending"` in the syncLog.
4. WHILE Kiosk_Mode is active and the device has no network connection, THE Kiosk_Mode SHALL display an offline indicator within the Kiosk_Mode screen containing the text "Offline — data disimpan lokal".
5. IF a conflict is detected during sync for a Kiosk-recorded entity, THEN THE Sync_Layer SHALL set `syncStatus: "conflict"` on both the entity record and its corresponding syncLog entry.
6. WHEN a syncLog entry has `syncStatus: "conflict"`, THE PendingActionsPanel SHALL display the conflicted entity with the label "Konflik data — perlu ditinjau" and SHALL provide a resolve action available to users with `role === "validator"` or `role === "admin"`.
