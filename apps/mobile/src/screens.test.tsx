import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react-native";
import type { JSX, ReactNode } from "react";

import * as api from "@/src/lib/api";
import type { CourseSummary, StudentEnrollment } from "@/src/lib/api";
import * as auth from "@/src/lib/auth";
import { LocaleProvider } from "@/src/lib/locale";

import CatalogScreen from "@/app/(tabs)/explore";
import HomeScreen from "@/app/(tabs)/index";
import ProfileScreen from "@/app/(tabs)/profile";

/**
 * Smoke tests for the screens: each renders its skeleton, then its content or
 * its empty state. Nothing here asserts on layout — the point is that the
 * module graph of a route actually executes, which is precisely what
 * typechecking and bundling do not tell you.
 *
 * Routes live under `app/`, where Expo Router treats every file as a route, so
 * the tests live here and import across.
 */

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: ReactNode }) => children,
  Redirect: () => null,
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ courseId: "course-1" }),
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() })
}));

// FlashList measures its window, which a test renderer has none of.
jest.mock("@shopify/flash-list", () => {
  const { View } = jest.requireActual("react-native");

  return {
    FlashList: ({
      data,
      renderItem
    }: {
      data: readonly unknown[];
      renderItem: (info: { index: number; item: unknown }) => ReactNode;
    }) => <View>{data.map((item, index) => renderItem({ index, item }))}</View>
  };
});

const SESSION: auth.MobileSession = {
  session: { isActive: true, profileCompleted: true, role: "STUDENT" },
  user: { email: "student@example.com", id: "user-1", image: null, name: "A Student" }
};

const COURSE: CourseSummary = {
  category: { name: "HSC Maths", slug: "hsc-maths" },
  coverImageUrl: null,
  description: "Everything on the syllabus, in order.",
  id: "course-1",
  isExamOnly: false,
  price: "1200.00",
  slug: "higher-maths",
  stats: {
    freeLessonCount: 1,
    lectureCount: 12,
    reviewAverage: 4.5,
    reviewCount: 8,
    totalDurationSeconds: 5400
  },
  status: "PUBLISHED",
  teachers: [],
  title: "Higher Mathematics"
};

const ENROLLMENT: StudentEnrollment = {
  accessGranted: true,
  cancelledAt: null,
  completedAt: null,
  course: {
    coverImageUrl: null,
    id: "course-1",
    price: "1200.00",
    slug: "higher-maths",
    title: "Higher Mathematics"
  },
  enrolledAt: "2026-01-01T00:00:00.000Z",
  id: "enrol-1",
  latestPaymentStatus: "SUCCESS",
  progressPercentage: 40,
  status: "ACTIVE"
};

/** Retries are off — a failing query in a test should fail once and be visible. */
function renderScreen(node: JSX.Element): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: 0, retry: false } }
  });

  render(
    <LocaleProvider>
      <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>
    </LocaleProvider>
  );
}

beforeEach(() => {
  jest.restoreAllMocks();
  jest.spyOn(auth, "fetchSession").mockResolvedValue(SESSION);
});

describe("catalogue", () => {
  test("shows a skeleton, then the courses", async () => {
    jest.spyOn(api, "listCategories").mockResolvedValue([]);
    jest.spyOn(api, "listCourses").mockResolvedValue({ items: [COURSE], pages: 1 });

    renderScreen(<CatalogScreen />);

    await waitFor(() => {
      expect(screen.getByText("Higher Mathematics")).toBeTruthy();
    });
    expect(screen.getByText("সব কোর্স")).toBeTruthy();
  });

  test("says so when nothing matches, rather than showing an empty list", async () => {
    jest.spyOn(api, "listCategories").mockResolvedValue([]);
    jest.spyOn(api, "listCourses").mockResolvedValue({ items: [], pages: 0 });

    renderScreen(<CatalogScreen />);

    await waitFor(() => {
      expect(screen.getByText("এই নামে কোনো কোর্স পাওয়া যায়নি")).toBeTruthy();
    });
  });
});

describe("home", () => {
  test("lists the enrolments", async () => {
    jest.spyOn(api, "listMyEnrollments").mockResolvedValue([ENROLLMENT]);

    renderScreen(<HomeScreen />);

    await waitFor(() => {
      expect(screen.getAllByText("Higher Mathematics").length).toBeGreaterThan(0);
    });
    expect(screen.getByText("40%")).toBeTruthy();
  });

  test("an account with nothing enrolled is told where to start", async () => {
    jest.spyOn(api, "listMyEnrollments").mockResolvedValue([]);

    renderScreen(<HomeScreen />);

    await waitFor(() => {
      expect(screen.getByText("এখনো কোনো কোর্সে ভর্তি হওনি। ক্যাটালগ ঘুরে দেখ।")).toBeTruthy();
    });
  });

  test("a completed course offers its certificate, and an active one does not", async () => {
    jest
      .spyOn(api, "listMyEnrollments")
      .mockResolvedValue([
        { ...ENROLLMENT, completedAt: "2026-02-01T00:00:00.000Z", status: "COMPLETED" }
      ]);

    renderScreen(<HomeScreen />);

    await waitFor(() => {
      expect(screen.getByText("সার্টিফিকেট নামাও")).toBeTruthy();
    });
  });
});

describe("profile", () => {
  test("an incomplete profile leads with the thing blocking the account", async () => {
    jest.spyOn(auth, "fetchSession").mockResolvedValue({
      ...SESSION,
      session: { ...SESSION.session, profileCompleted: false }
    });
    jest.spyOn(api, "getOwnProfile").mockResolvedValue({
      studentProfile: null,
      teacherProfile: null,
      user: {
        email: "student@example.com",
        id: "user-1",
        image: null,
        isActive: true,
        name: "A Student",
        profileCompleted: false,
        role: "STUDENT",
        slug: null
      }
    });

    renderScreen(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByText("প্রোফাইল শেষ করো")).toBeTruthy();
    });
    expect(screen.getByText("প্রোফাইল সম্পূর্ণ করো")).toBeTruthy();
  });
});
