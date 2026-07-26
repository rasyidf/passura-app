import "fake-indexeddb/auto";
import fc from "fast-check";
import {
  ELDER_STEPS,
  getResumeStep,
  shouldShowWizard,
  shouldShowReminderBanner,
  validateSameParty,
  type OnboardingState,
} from "../onboarding-state";
import { PassuraDb } from "@/db/local-db";

// ─── Shared arbitraries ───────────────────────────────────────────────────────

/** Builds a minimal valid OnboardingState with overrides */
const onboardingStateArb = (
  overrides: Partial<fc.Arbitrary<OnboardingState>> = {},
): fc.Arbitrary<OnboardingState> =>
  fc.record<OnboardingState>({
    userId: fc.string({ minLength: 1 }),
    role: fc.constantFrom("validator", "admin", "superadmin", "participant"),
    completedSteps: fc.array(fc.string()),
    isComplete: fc.boolean(),
    completedAt: fc.option(fc.integer({ min: 0 }), { nil: null }),
    skipped: fc.boolean(),
    skipSessionCount: fc.integer({ min: 0, max: 20 }),
    reminderDismissed: fc.boolean(),
    ...overrides,
  } as Record<keyof OnboardingState, fc.Arbitrary<unknown>> as Parameters<typeof fc.record<OnboardingState>>[0]);

// ─── Property 1: Wizard resume finds the first incomplete step ────────────────
// Validates: Requirements 1.5, 3.7

describe("Property 1: getResumeStep returns first step not in completedSteps", () => {
  it("returns the index of the first incomplete step", () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray([...ELDER_STEPS]),
        (completed) => {
          const resumeIdx = getResumeStep(ELDER_STEPS, completed as typeof ELDER_STEPS[number][]);
          const completedSet = new Set(completed);
          const expected = ELDER_STEPS.findIndex((s) => !completedSet.has(s));
          return resumeIdx === (expected === -1 ? ELDER_STEPS.length - 1 : expected);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 3: Completed onboarding state hides the wizard ─────────────────
// Validates: Requirement 1.3

describe("Property 3: shouldShowWizard returns false when isComplete is true", () => {
  it("never shows wizard when isComplete === true", () => {
    fc.assert(
      fc.property(
        onboardingStateArb({
          isComplete: fc.constant(true) as unknown as fc.Arbitrary<boolean>,
        }),
        (state) => {
          return shouldShowWizard(state) === false;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("always shows wizard when state is null", () => {
    expect(shouldShowWizard(null)).toBe(true);
  });
});

// ─── Property 4: Reminder banner visibility ───────────────────────────────────
// Validates: Requirement 1.7

describe("Property 4: shouldShowReminderBanner iff skipSessionCount<=7 && !reminderDismissed", () => {
  it("returns true iff skipped && skipSessionCount<=7 && !reminderDismissed", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        fc.boolean(),
        (skipSessionCount, reminderDismissed) => {
          const state: OnboardingState = {
            userId: "user-1",
            role: "validator",
            completedSteps: [],
            isComplete: false,
            completedAt: null,
            skipped: true,
            skipSessionCount,
            reminderDismissed,
          };
          const result = shouldShowReminderBanner(state);
          const expected = skipSessionCount <= 7 && !reminderDismissed;
          return result === expected;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("always returns false when skipped is false", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        fc.boolean(),
        (skipSessionCount, reminderDismissed) => {
          const state: OnboardingState = {
            userId: "user-1",
            role: "validator",
            completedSteps: [],
            isComplete: false,
            completedAt: null,
            skipped: false,
            skipSessionCount,
            reminderDismissed,
          };
          return shouldShowReminderBanner(state) === false;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 7: Same-clan validation ────────────────────────────────────────
// Validates: Requirements 6.7, 7.4, 8.4

describe("Property 7: validateSameParty rejects identical IDs", () => {
  it("returns a non-empty error string when both IDs are the same", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 21, maxLength: 21 }),
        (id) => {
          const result = validateSameParty(id, id);
          return result.length > 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("returns an empty string when the two IDs differ", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 21, maxLength: 21 }),
        fc.string({ minLength: 21, maxLength: 21 }),
        (idA, idB) => {
          // Only test when the two IDs are genuinely different
          fc.pre(idA !== idB);
          const result = validateSameParty(idA, idB);
          return result === "";
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 5: Admin save writes syncStatus "pending" ──────────────────────
// Validates: Requirement 3.6
//
// Strategy:
//   fake-indexeddb/auto patches globalThis.indexedDB so all Dexie instances
//   use in-memory storage. We mock `@/db/local-db` so the `db` singleton
//   inside BaseRepository's syncLog writes points to the same in-memory
//   PassuraDb instance our assertions read from.
//   We initialise testDb eagerly in a module-level beforeAll to guarantee
//   the instance is ready before any test hook runs.

let p5Db: PassuraDb;

vi.mock("@/db/local-db", async () => {
  const { PassuraDb } = await vi.importActual<typeof import("@/db/local-db")>("@/db/local-db");
  const instance = new PassuraDb();
  return { db: instance, PassuraDb, __testInstance: instance };
});

beforeAll(async () => {
  // Retrieve the in-memory instance that the mock factory created.
  const mod = await import("@/db/local-db");
  p5Db = (mod as typeof mod & { __testInstance: PassuraDb }).__testInstance;
});

async function clearTestDb() {
  await p5Db.clans.clear();
  await p5Db.animalTypes.clear();
  await p5Db.groups.clear();
  await p5Db.syncLog.clear();
}

describe("Property 5: Admin entity saves write correct sync entries", () => {
  beforeEach(async () => {
    await clearTestDb();
  });

  it("Clan create: entity has syncStatus 'local' and syncLog entry has syncStatus 'pending' + action 'create'", async () => {
    const { clansRepo } = await import("@/db/repositories");

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1 }),
          region: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          lineageHead: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
        }),
        async (data) => {
          await clearTestDb();
          const entity = await clansRepo.create(data);

          const stored = await p5Db.clans.get(entity.id);
          if (!stored) return false;
          if (stored.syncStatus !== "local") return false;

          const logs = await p5Db.syncLog
            .where("entityId")
            .equals(entity.id)
            .toArray();
          if (logs.length === 0) return false;
          return logs.some((l) => l.syncStatus === "pending" && l.action === "create");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("AnimalType create: entity has syncStatus 'local' and syncLog entry has syncStatus 'pending' + action 'create'", async () => {
    const { animalTypesRepo } = await import("@/db/repositories");

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1 }),
          category: fc.constantFrom("buffalo" as const, "pig" as const),
          breed: fc.string({ minLength: 1 }),
          geneticLine: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          quality: fc.constantFrom("low" as const, "medium" as const, "high" as const, "unique" as const),
          price: fc.integer({ min: 0, max: 10_000_000 }),
        }),
        async (data) => {
          await clearTestDb();
          const entity = await animalTypesRepo.create(data);

          const stored = await p5Db.animalTypes.get(entity.id);
          if (!stored) return false;
          if (stored.syncStatus !== "local") return false;

          const logs = await p5Db.syncLog
            .where("entityId")
            .equals(entity.id)
            .toArray();
          if (logs.length === 0) return false;
          return logs.some((l) => l.syncStatus === "pending" && l.action === "create");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Group create: entity has syncStatus 'local' and syncLog entry has syncStatus 'pending' + action 'create'", async () => {
    const { groupsRepo } = await import("@/db/repositories");

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1 }),
          eventName: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          description: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          members: fc.array(fc.string({ minLength: 1 })),
        }),
        async (data) => {
          await clearTestDb();
          const entity = await groupsRepo.create(data);

          const stored = await p5Db.groups.get(entity.id);
          if (!stored) return false;
          if (stored.syncStatus !== "local") return false;

          const logs = await p5Db.syncLog
            .where("entityId")
            .equals(entity.id)
            .toArray();
          if (logs.length === 0) return false;
          return logs.some((l) => l.syncStatus === "pending" && l.action === "create");
        },
      ),
      { numRuns: 100 },
    );
  });
});
