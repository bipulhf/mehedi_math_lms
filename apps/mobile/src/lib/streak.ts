import type { Locale } from "@mma/i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * A local, device-only study streak — which days in the last week the student
 * opened a lecture, and how many of the most recent consecutive days that
 * covers. There is no server concept of this yet (ADR: none), so it does not
 * survive a reinstall or follow the student to a second device — a real
 * streak endpoint is a deliberately separate, later addition, not something
 * this quietly grows into.
 */

const STORAGE_KEY = "mma.study-activity-dates";
const WEEK_LENGTH = 7;
/** Enough days to compute any streak the 7-day strip could show, plus slack. */
const RETAINED_DAYS = 90;

/**
 * Short weekday labels, `Date#getDay()`-indexed (Sunday first). Not
 * `Intl.DateTimeFormat(locale, { weekday: "narrow" })`: Hermes' `Intl` data
 * for `bn-BD` is not guaranteed complete, and this app has never run on real
 * hardware to find out (`docs/mobile-plan.md` Stage 0) — a small fixed table
 * is one less thing that can fail silently on a device we haven't tested.
 */
const WEEKDAY_LABELS: Record<Locale, readonly string[]> = {
  bn: ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহ", "শুক্র", "শনি"],
  en: ["S", "M", "T", "W", "T", "F", "S"]
};

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function readDates(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);

  if (raw === null) {
    return new Set();
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed) ? new Set(parsed.filter((value) => typeof value === "string")) : new Set();
  } catch {
    return new Set();
  }
}

/** Marks today as a study day. Safe to call as often as a lecture is opened — repeats are a no-op. */
export async function recordStudyActivity(): Promise<void> {
  const dates = await readDates();
  const today = dateKey(new Date());

  if (dates.has(today)) {
    return;
  }

  const next = [...dates, today].sort().slice(-RETAINED_DAYS);

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export interface StreakDaySummary {
  date: string;
  isToday: boolean;
  label: string;
  studied: boolean;
}

export interface StreakSummary {
  /** Oldest first, ending in today. */
  days: readonly StreakDaySummary[];
  streakCount: number;
}

export async function getStreakSummary(locale: Locale): Promise<StreakSummary> {
  const dates = await readDates();
  const today = new Date();
  const labels = WEEKDAY_LABELS[locale];

  const days = Array.from({ length: WEEK_LENGTH }, (_, index) => {
    const cursor = new Date(today);

    cursor.setDate(cursor.getDate() - (WEEK_LENGTH - 1 - index));

    const key = dateKey(cursor);

    return {
      date: key,
      isToday: index === WEEK_LENGTH - 1,
      label: labels[cursor.getDay()] ?? "",
      studied: dates.has(key)
    };
  });

  let streakCount = 0;
  const cursor = new Date(today);

  while (dates.has(dateKey(cursor))) {
    streakCount += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { days, streakCount };
}
