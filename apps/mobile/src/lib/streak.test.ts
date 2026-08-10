import AsyncStorage from "@react-native-async-storage/async-storage";

import { getStreakSummary, recordStudyActivity } from "@/src/lib/streak";

/**
 * A local, device-only streak — no server round trip, so these tests exercise
 * the real AsyncStorage mock (`jest.setup.ts`) rather than a stub.
 */

const STORAGE_KEY = "mma.study-activity-dates";

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysAgo(count: number): Date {
  const date = new Date();

  date.setDate(date.getDate() - count);

  return date;
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("getStreakSummary", () => {
  test("a fresh install has no streak", async () => {
    const summary = await getStreakSummary("en");

    expect(summary.streakCount).toBe(0);
    expect(summary.days).toHaveLength(7);
    expect(summary.days.every((day) => !day.studied)).toBe(true);
    expect(summary.days.at(-1)?.isToday).toBe(true);
  });

  test("weekday labels differ per locale but are never empty", async () => {
    const bn = await getStreakSummary("bn");
    const en = await getStreakSummary("en");

    expect(bn.days.at(-1)?.label).not.toBe(en.days.at(-1)?.label);
    expect(bn.days.every((day) => day.label.length > 0)).toBe(true);
    expect(en.days.every((day) => day.label.length > 0)).toBe(true);
  });
});

describe("recordStudyActivity", () => {
  test("recording today counts once even when called twice", async () => {
    await recordStudyActivity();
    await recordStudyActivity();

    const summary = await getStreakSummary("en");

    expect(summary.streakCount).toBe(1);
    expect(summary.days.at(-1)?.studied).toBe(true);
  });

  test("consecutive prior days extend the streak through today", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([daysAgo(3), daysAgo(2), daysAgo(1)].map(dateKey))
    );
    await recordStudyActivity();

    const summary = await getStreakSummary("en");

    expect(summary.streakCount).toBe(4);
  });

  test("a gap in the middle does not connect to today", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([dateKey(daysAgo(5))]));
    await recordStudyActivity();

    const summary = await getStreakSummary("en");

    expect(summary.streakCount).toBe(1);
  });
});
