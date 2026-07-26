/**
 * Property-based tests for the Loan Kiosk Flow.
 *
 * Property 8: Confirm writes entity + syncLog
 *   For any valid LoanKioskDraft, calling draftToLoan() then loansRepo.create()
 *   must produce an entity with syncStatus === "local" AND a syncLog entry with
 *   action === "create", syncStatus === "pending", entityId === entity.id.
 *
 * Property 10: Summary renders no raw UUIDs
 *   For any LoanKioskDraft whose ID fields contain UUID-format strings, rendering
 *   LoanStep8Summary must produce output with NO UUID or nanoid patterns visible
 *   in the rendered text.
 *
 * Validates: Requirements 6.2, 6.4, 10.1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fc from "fast-check";
import { render } from "@testing-library/react";
import React from "react";

// ─── fake-indexeddb ───────────────────────────────────────────────────────────
// Provides a real in-memory IndexedDB environment for jsdom.
import "fake-indexeddb/auto";

import { PassuraDb } from "@/db/local-db";
import { BaseRepository } from "@/db/repositories/base.repo";
import { draftToLoan } from "@/kiosk/KioskDraft";
import type { LoanKioskDraft } from "@/kiosk/KioskDraft";
import type { Loan } from "@/db/types";

// ─── Mock @/db/local-db for the summary component ────────────────────────────
//
// LoanStep8Summary calls db.elders.where('id').anyOf(witnessIds).toArray().
// We mock the module so it returns an empty array (no witnesses), isolating the
// UUID-rendering test from real IndexedDB lookups.
vi.mock("@/db/local-db", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/db/local-db")>();
  return {
    ...original,
    db: {
      ...original.db,
      elders: {
        where: vi.fn().mockReturnValue({
          anyOf: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([]),
          }),
        }),
      },
    },
  };
});

// Import the summary component AFTER the mock is registered
import { LoanStep8Summary } from "@/kiosk/steps/loan/LoanStep8Summary";

// ─── Pattern constants ────────────────────────────────────────────────────────

/** Standard UUID v4 pattern */
const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * generateId() produces a 21-character string of lowercase letters and digits
 * (no hyphens).  We detect it as 21 consecutive word chars that are all [0-9a-z].
 */
const NANOID_PATTERN = /\b[0-9a-z]{21}\b/;

// ─── fast-check arbitraries ───────────────────────────────────────────────────

/** Arbitrary for a non-empty human-readable name (no UUID/nanoid patterns) */
const fcName = fc
  .stringMatching(/^[A-Za-z][A-Za-z\s]{0,28}[A-Za-z]$/)
  .filter((s) => !UUID_PATTERN.test(s) && !NANOID_PATTERN.test(s));

/** Arbitrary for an ISO date string YYYY-MM-DD */
const fcIsoDate = fc
  .record({
    year: fc.integer({ min: 2020, max: 2030 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }),
  })
  .map(
    ({ year, month, day }) =>
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  );

/** Arbitrary for a standard UUID string */
const fcUUID = fc.uuid();

/**
 * Arbitrary for a valid money-type LoanKioskDraft where all ID fields hold
 * UUID-format strings and all human-readable name fields hold safe display text.
 */
const fcLoanKioskDraftMoney = fc
  .record({
    groupId: fcUUID,
    groupName: fcName,
    lenderClanId: fcUUID,
    lenderClanName: fcName,
    borrowerClanId: fcUUID,
    borrowerClanName: fcName,
    moneyAmount: fc.integer({ min: 1000, max: 999_999_999 }),
    dateIssued: fcIsoDate,
  })
  .filter((d) => d.lenderClanId !== d.borrowerClanId)
  .map(
    (d): LoanKioskDraft => ({
      flowType: "loan",
      currentStep: 8,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      groupId: d.groupId,
      groupName: d.groupName,
      lenderClanId: d.lenderClanId,
      lenderClanName: d.lenderClanName,
      borrowerClanId: d.borrowerClanId,
      borrowerClanName: d.borrowerClanName,
      loanType: "money",
      moneyAmount: d.moneyAmount,
      animalTypeId: null,
      animalTypeName: null,
      quantity: null,
      dateIssued: d.dateIssued,
      witnessIds: [],
    })
  );

/**
 * Arbitrary for a valid animal-type LoanKioskDraft.
 */
const fcLoanKioskDraftAnimal = fc
  .record({
    groupId: fcUUID,
    groupName: fcName,
    lenderClanId: fcUUID,
    lenderClanName: fcName,
    borrowerClanId: fcUUID,
    borrowerClanName: fcName,
    animalTypeId: fcUUID,
    animalTypeName: fcName,
    quantity: fc.integer({ min: 1, max: 100 }),
    dateIssued: fcIsoDate,
  })
  .filter((d) => d.lenderClanId !== d.borrowerClanId)
  .map(
    (d): LoanKioskDraft => ({
      flowType: "loan",
      currentStep: 8,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      groupId: d.groupId,
      groupName: d.groupName,
      lenderClanId: d.lenderClanId,
      lenderClanName: d.lenderClanName,
      borrowerClanId: d.borrowerClanId,
      borrowerClanName: d.borrowerClanName,
      loanType: "animal",
      moneyAmount: null,
      animalTypeId: d.animalTypeId,
      animalTypeName: d.animalTypeName,
      quantity: d.quantity,
      dateIssued: d.dateIssued,
      witnessIds: [],
    })
  );

/** Union of money and animal loanType variants */
const fcLoanKioskDraft = fc.oneof(fcLoanKioskDraftMoney, fcLoanKioskDraftAnimal);

// ─── Property 8 ───────────────────────────────────────────────────────────────
//
// Feature: onboarding-kiosk-flow
// Property 8: Confirm writes entity + syncLog
//
// Validates: Requirements 6.2, 10.1

describe("Property 8: Confirm writes entity + syncLog (fake-indexeddb)", () => {
  it(
    "entity written by loansRepo.create() has syncStatus === 'local' — 100 runs",
    async () => {
      await fc.assert(
        fc.asyncProperty(fcLoanKioskDraft, async (draft) => {
          // Spin up a fresh DB per iteration to keep state isolated
          const iterDb = new PassuraDb();
          const iterRepo = new BaseRepository<Loan>("loans", iterDb.loans);

          try {
            const loanPayload = draftToLoan(draft);
            const entity = await iterRepo.create(loanPayload);

            // Entity must be written with syncStatus "local"
            expect(entity.syncStatus).toBe("local");
            expect(entity.id).toBeTruthy();

            // Confirm the record is actually in the table
            const persisted = await iterDb.loans.get(entity.id);
            expect(persisted).toBeDefined();
            expect(persisted!.syncStatus).toBe("local");
          } finally {
            await iterDb.close();
          }
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    "syncLog entry has action === 'create', syncStatus === 'pending', entityId matches the new entity — 100 runs",
    async () => {
      await fc.assert(
        fc.asyncProperty(fcLoanKioskDraft, async (draft) => {
          const iterDb = new PassuraDb();
          const iterRepo = new BaseRepository<Loan>("loans", iterDb.loans);

          try {
            const loanPayload = draftToLoan(draft);
            const entity = await iterRepo.create(loanPayload);

            // There must be at least one syncLog entry for this entity
            const logs = await iterDb.syncLog
              .where("entityId")
              .equals(entity.id)
              .toArray();

            expect(logs.length).toBeGreaterThanOrEqual(1);

            // The create entry must have the expected fields
            const createLog = logs.find(
              (l) => l.action === "create" && l.entityType === "loans"
            );
            expect(createLog).toBeDefined();
            expect(createLog!.syncStatus).toBe("pending");
            expect(createLog!.entityId).toBe(entity.id);
          } finally {
            await iterDb.close();
          }
        }),
        { numRuns: 100 }
      );
    }
  );
});

// ─── Property 10 ──────────────────────────────────────────────────────────────
//
// Feature: onboarding-kiosk-flow
// Property 10: Summary renders no raw UUIDs
//
// Validates: Requirements 6.4, 10.1

describe("Property 10: LoanStep8Summary renders no raw UUIDs or nanoid IDs — 100 runs", () => {
  it(
    "rendered text contains no UUID-format or nanoid-format strings — money loanType",
    async () => {
      await fc.assert(
        fc.asyncProperty(fcLoanKioskDraftMoney, async (draft) => {
          const { container, unmount } = render(
            React.createElement(LoanStep8Summary, {
              draft,
              onNext: vi.fn().mockResolvedValue(undefined),
              onBack: vi.fn(),
            })
          );

          const text = container.textContent ?? "";

          // No UUID pattern must appear in the rendered output
          expect(UUID_PATTERN.test(text)).toBe(false);
          // No nanoid pattern must appear in the rendered output
          expect(NANOID_PATTERN.test(text)).toBe(false);

          unmount();
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    "rendered text contains no UUID-format or nanoid-format strings — animal loanType",
    async () => {
      await fc.assert(
        fc.asyncProperty(fcLoanKioskDraftAnimal, async (draft) => {
          const { container, unmount } = render(
            React.createElement(LoanStep8Summary, {
              draft,
              onNext: vi.fn().mockResolvedValue(undefined),
              onBack: vi.fn(),
            })
          );

          const text = container.textContent ?? "";

          expect(UUID_PATTERN.test(text)).toBe(false);
          expect(NANOID_PATTERN.test(text)).toBe(false);

          unmount();
        }),
        { numRuns: 100 }
      );
    }
  );
});
