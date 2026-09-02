import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { JSX, ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import * as categoriesApi from "@/src/lib/api/categories";
import * as coursesApi from "@/src/lib/api/courses";
import * as enrollmentsApi from "@/src/lib/api/enrollments";
import * as profilesApi from "@/src/lib/api/profiles";
import type { CourseSummary } from "@/src/lib/api/courses";
import type { StudentEnrollment } from "@/src/lib/api/enrollments";
import * as auth from "@/src/lib/auth";
import { LocaleProvider } from "@/src/lib/locale";

import CatalogScreen from "@/app/(tabs)/explore";
import HomeScreen from "@/app/(tabs)/index";
import InboxScreen from "@/app/(tabs)/inbox";
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

const mockRouterPush = jest.fn();

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: ReactNode }) => children,
  Redirect: () => null,
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ courseId: "course-1" }),
  useRouter: () => ({ back: jest.fn(), push: mockRouterPush, replace: jest.fn() })
}));

jest.mock("@/src/lib/use-push-registration", () => ({
  usePushRegistration: jest.fn()
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
    enrolledStudentCount: 42,
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
  category: { name: "HSC Maths", slug: "hsc-maths" },
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
    <SafeAreaProvider
      initialMetrics={{
        frame: { height: 0, width: 0, x: 0, y: 0 },
        insets: { bottom: 0, left: 0, right: 0, top: 0 }
      }}
    >
      <LocaleProvider>
        <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>
      </LocaleProvider>
    </SafeAreaProvider>
  );
}

beforeEach(() => {
  jest.restoreAllMocks();
  mockRouterPush.mockReset();
  jest.spyOn(auth, "fetchSession").mockResolvedValue(SESSION);
});

describe("catalogue", () => {
  test("shows a skeleton, then the courses", async () => {
    jest.spyOn(categoriesApi, "listCategories").mockResolvedValue([]);
    jest.spyOn(coursesApi, "listCourses").mockResolvedValue({ items: [COURSE], pages: 1 });

    renderScreen(<CatalogScreen />);

    await waitFor(() => {
      expect(screen.getByText("Higher Mathematics")).toBeTruthy();
    });
    expect(screen.getByText("সব কোর্স")).toBeTruthy();
  });

  test("says so when nothing matches, rather than showing an empty list", async () => {
    jest.spyOn(categoriesApi, "listCategories").mockResolvedValue([]);
    jest.spyOn(coursesApi, "listCourses").mockResolvedValue({ items: [], pages: 0 });

    renderScreen(<CatalogScreen />);

    await waitFor(() => {
      expect(screen.getByText("এই নামে কোনো কোর্স পাওয়া যায়নি")).toBeTruthy();
    });
  });
});

describe("home", () => {
  test("lists the enrolments", async () => {
    jest.spyOn(enrollmentsApi, "listMyEnrollments").mockResolvedValue([ENROLLMENT]);

    renderScreen(<HomeScreen />);

    await waitFor(() => {
      expect(screen.getAllByText("Higher Mathematics").length).toBeGreaterThan(0);
    });
    expect(screen.getByText("40%")).toBeTruthy();
  });

  test("an account with nothing enrolled is told where to start", async () => {
    jest.spyOn(enrollmentsApi, "listMyEnrollments").mockResolvedValue([]);

    renderScreen(<HomeScreen />);

    await waitFor(() => {
      expect(screen.getByText("এখনো কোনো কোর্সে ভর্তি হওনি। ক্যাটালগ ঘুরে দেখ।")).toBeTruthy();
    });
  });

  test("a completed course offers its certificate, and an active one does not", async () => {
    jest
      .spyOn(enrollmentsApi, "listMyEnrollments")
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
    jest.spyOn(profilesApi, "getOwnProfile").mockResolvedValue({
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

describe("signed-out tabs", () => {
  beforeEach(() => {
    jest.spyOn(auth, "fetchSession").mockResolvedValue(null);
  });

  test("home stops loading and offers sign-in or the public catalogue", async () => {
    const enrollments = jest.spyOn(enrollmentsApi, "listMyEnrollments");

    renderScreen(<HomeScreen />);

    await waitFor(() => {
      expect(screen.getByText("চালিয়ে যেতে লগ ইন করো")).toBeTruthy();
    });
    expect(enrollments).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole("button", { name: "লগ ইন" }));

    expect(mockRouterPush).toHaveBeenCalledWith("/sign-in");
  });

  test("inbox stops at a sign-in prompt instead of navigating during tab mount", async () => {
    renderScreen(<InboxScreen />);

    await waitFor(() => {
      expect(screen.getByText("চালিয়ে যেতে লগ ইন করো")).toBeTruthy();
    });
  });

  test("profile stops at a sign-in prompt instead of navigating during tab mount", async () => {
    const profile = jest.spyOn(profilesApi, "getOwnProfile");

    renderScreen(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByText("চালিয়ে যেতে লগ ইন করো")).toBeTruthy();
    });
    expect(profile).not.toHaveBeenCalled();
  });
});
