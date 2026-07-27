/**
 * Integration tests for the full onboarding state lifecycle.
 *
 * Tests the useOnboardingState hook against a real in-memory Dexie instance
 * powered by fake-indexeddb, covering the full elder onboarding flow,
 * resume from partial state, and skip.
 *
 * Requirements: 1.1, 1.2, 1.5, 1.6
 */

import "fake-indexeddb/auto";
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { useOnboardingState } from "@/onboarding/useOnboardingState";
import { ELDER_STEPS, getResumeStep } from "@/onboarding/onboarding-state";
import type { OnboardingState } from "@/onboarding/onboarding-state";
import { PassuraDb } from "@/db/local-db";

// ─── In-memory Dexie instance ─────────────────────────────────────────────────
//
// We mock `@/db/local-db` so `db` and `useLiveQuery` inside the hook both point
// to the same in-memory PassuraDb instance backed by fake-indexeddb.

let testDb: PassuraDb;

vi.mock("@/db/local-db", async () => {
  const { PassuraDb } = await vi.importActual<typeof import("@/db/local-db")>("@/db/local-db");
  const instance = new PassuraDb();
  return { db: instance, PassuraDb, __testInstance: instance };
});

beforeAll(async () => {
  const mod = await import("@/db/local-db");
  testDb = (mod as typeof mod & { __testInstance: PassuraDb }).__testInstance;
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ONBOARDING_KEY = "onboarding-state";
const TEST_USER_ID = "test-elder-001";

/** Writes an OnboardingState directly to the fake store (simulates pre-existing DB state). */
async function seedState(partial: Partial<OnboardingState>) {
  const base: OnboardingState = {
    userId: TEST_USER_ID,
    role: "validator",
    completedSteps: [],
    isComplete: false,
    completedAt: null,
    skipped: false,
    skipSessionCount: 0,
    reminderDismissed: false,
  };
  await testDb.appConfig.put({ key: ONBOARDING_KEY, value: { ...base, ...partial } });
}

/** Reads the current state from the in-memory DB. */
async function readState(): Promise<OnboardingState | undefined> {
  const record = await testDb.appConfig.get(ONBOARDING_KEY);
  return record?.value as OnboardingState | undefined;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Integration: Full Elder Onboarding lifecycle", () => {
  beforeEach(async () => {
    await testDb.appConfig.clear();
    vi.clearAllMocks();
  });

  // ── 1. Full elder onboarding: completeStep for each ELDER_STEPS step ──────
  //
  // Validates: Requirements 1.1, 1.2

  describe("Full Elder Onboarding — completeStep through all steps", () => {
    it("marks isComplete=true and sets completedAt after completing the last step", async () => {
      const { result } = renderHook(() => useOnboardingState(TEST_USER_ID));

      // Wait for initial load to finish
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Complete each step in sequence
      for (const stepId of ELDER_STEPS) {
        await act(async () => {
          await result.current.completeStep(stepId);
        });
      }

      // After all steps, call completeAll to finalize
      await act(async () => {
        await result.current.completeAll();
      });

      // Local state should reflect completion
      expect(result.current.state?.isComplete).toBe(true);
      expect(result.current.state?.completedAt).not.toBeNull();
      expect(typeof result.current.state?.completedAt).toBe("number");

      // Persisted state in fake DB should also reflect completion
      const persisted = await readState();
      expect(persisted?.isComplete).toBe(true);
      expect(persisted?.completedAt).not.toBeNull();
    });

    it("accumulates completedSteps in order through all ELDER_STEPS", async () => {
      const { result } = renderHook(() => useOnboardingState(TEST_USER_ID));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      for (const stepId of ELDER_STEPS) {
        await act(async () => {
          await result.current.completeStep(stepId);
        });
      }

      const persisted = await readState();
      // Every ELDER_STEPS entry must appear in completedSteps
      for (const stepId of ELDER_STEPS) {
        expect(persisted?.completedSteps).toContain(stepId);
      }
      expect(persisted?.completedSteps).toHaveLength(ELDER_STEPS.length);
    });

    it("each completeStep persists to DB BEFORE state advances (Property 2)", async () => {
      const { result } = renderHook(() => useOnboardingState(TEST_USER_ID));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // After completing the first step, it must be in the DB immediately
      await act(async () => {
        await result.current.completeStep("elder-welcome");
      });

      const persisted = await readState();
      expect(persisted?.completedSteps).toContain("elder-welcome");
    });

    it("deduplicates when the same step is completed twice", async () => {
      const { result } = renderHook(() => useOnboardingState(TEST_USER_ID));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.completeStep("elder-welcome");
      });
      await act(async () => {
        await result.current.completeStep("elder-welcome");
      });

      const persisted = await readState();
      const welcomeCount = persisted?.completedSteps.filter(
        (s) => s === "elder-welcome"
      ).length ?? 0;
      expect(welcomeCount).toBe(1);
    });
  });

  // ── 2. Resume from partial state ─────────────────────────────────────────
  //
  // Validates: Requirement 1.5

  describe("Resume from partial state", () => {
    it("getResumeStep returns index 2 when elder-welcome and elder-clans are completed", () => {
      // Pure function test — no hook needed
      const completedSteps = ["elder-welcome", "elder-clans"] as (typeof ELDER_STEPS[number])[];
      const resumeIdx = getResumeStep(ELDER_STEPS, completedSteps);
      // "elder-transactions" is index 2 — it is the first incomplete step
      expect(resumeIdx).toBe(2);
      expect(ELDER_STEPS[resumeIdx]).toBe("elder-transactions");
    });

    it("hook loads partial state from DB and exposes the correct completedSteps", async () => {
      // Seed the DB with two completed steps (mimics ElderOnboardingWizard resume scenario)
      await seedState({ completedSteps: ["elder-welcome", "elder-clans"], isComplete: false });

      const { result } = renderHook(() => useOnboardingState(TEST_USER_ID));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.state?.completedSteps).toEqual(["elder-welcome", "elder-clans"]);
      expect(result.current.state?.isComplete).toBe(false);

      // Confirm getResumeStep would direct the wizard to step index 2 ("elder-transactions")
      const resumeIdx = getResumeStep(
        ELDER_STEPS,
        result.current.state?.completedSteps ?? []
      );
      expect(resumeIdx).toBe(2);
    });

    it("getResumeStep returns the last step index when all steps are complete", () => {
      const allCompleted = [...ELDER_STEPS];
      const resumeIdx = getResumeStep(ELDER_STEPS, allCompleted);
      expect(resumeIdx).toBe(ELDER_STEPS.length - 1);
    });

    it("getResumeStep returns 0 when no steps are completed", () => {
      const resumeIdx = getResumeStep(ELDER_STEPS, []);
      expect(resumeIdx).toBe(0);
    });

    it("state is null when DB has a record for a different userId", async () => {
      // Seed state belonging to a different user
      await testDb.appConfig.put({
        key: ONBOARDING_KEY,
        value: {
          userId: "other-user-999",
          role: "validator",
          completedSteps: ["elder-welcome"],
          isComplete: false,
          completedAt: null,
          skipped: false,
          skipSessionCount: 0,
          reminderDismissed: false,
        },
      });

      const { result } = renderHook(() => useOnboardingState(TEST_USER_ID));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Must not expose another user's state
      expect(result.current.state).toBeNull();
    });
  });

  // ── 3. Skip flow ──────────────────────────────────────────────────────────
  //
  // Validates: Requirement 1.6

  describe("Skip flow", () => {
    it("skip() sets isComplete=true, skipped=true, and completedSteps=[]", async () => {
      const { result } = renderHook(() => useOnboardingState(TEST_USER_ID));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.skip();
      });

      expect(result.current.state?.isComplete).toBe(true);
      expect(result.current.state?.skipped).toBe(true);
      expect(result.current.state?.completedSteps).toEqual([]);

      // Verify persistence
      const persisted = await readState();
      expect(persisted?.isComplete).toBe(true);
      expect(persisted?.skipped).toBe(true);
      expect(persisted?.completedSteps).toEqual([]);
    });

    it("skip() also sets completedAt to a numeric timestamp", async () => {
      const before = Date.now();

      const { result } = renderHook(() => useOnboardingState(TEST_USER_ID));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.skip();
      });

      const after = Date.now();

      const completedAt = result.current.state?.completedAt;
      expect(typeof completedAt).toBe("number");
      expect(completedAt).toBeGreaterThanOrEqual(before);
      expect(completedAt).toBeLessThanOrEqual(after);
    });

    it("skip() clears any previously accumulated completedSteps", async () => {
      // Seed with some completed steps before skip
      await seedState({ completedSteps: ["elder-welcome", "elder-clans"], isComplete: false });

      const { result } = renderHook(() => useOnboardingState(TEST_USER_ID));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.state?.completedSteps).toHaveLength(2);
      });

      await act(async () => {
        await result.current.skip();
      });

      expect(result.current.state?.completedSteps).toEqual([]);

      const persisted = await readState();
      expect(persisted?.completedSteps).toEqual([]);
    });
  });
});
