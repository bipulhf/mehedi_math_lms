import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react-native";
import type { JSX, ReactNode } from "react";

import * as api from "@/src/lib/api";
import type { CourseSummary, StudentEnrollment } from "@/src/lib/api";
import * as auth from "@/src/lib/auth";

import CatalogScreen from "@/app/(tabs)/index";
import LearningScreen from "@/app/(tabs)/learning";
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
  status: "PUBLISHED",
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
  progressPercentage: 40,
  status: "ACTIVE"
};

/** Retries are off — a failing query in a test should fail once and be visible. */
function renderScreen(node: JSX.Element): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: 0, retry: false } }
  });

  render(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);
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
    expect(screen.getByText("Catalog")).toBeTruthy();
  });

  test("says so when nothing matches, rather than showing an empty list", async () => {
    jest.spyOn(api, "listCategories").mockResolvedValue([]);
    jest.spyOn(api, "listCourses").mockResolvedValue({ items: [], pages: 0 });

    renderScreen(<CatalogScreen />);

    await waitFor(() => {
      expect(screen.getByText("No courses match")).toBeTruthy();
    });
  });
});

describe("learning", () => {
  test("lists the enrolments", async () => {
    jest.spyOn(api, "listMyEnrollments").mockResolvedValue([ENROLLMENT]);

    renderScreen(<LearningScreen />);

    await waitFor(() => {
      expect(screen.getByText("Higher Mathematics")).toBeTruthy();
    });
    expect(screen.getByText("40% complete")).toBeTruthy();
  });

  test("an account with nothing enrolled is told where to start", async () => {
    jest.spyOn(api, "listMyEnrollments").mockResolvedValue([]);

    renderScreen(<LearningScreen />);

    await waitFor(() => {
      expect(screen.getByText("No enrolments yet")).toBeTruthy();
    });
  });

  test("a completed course offers its certificate, and an active one does not", async () => {
    jest
      .spyOn(api, "listMyEnrollments")
      .mockResolvedValue([
        { ...ENROLLMENT, completedAt: "2026-02-01T00:00:00.000Z", status: "COMPLETED" }
      ]);

    renderScreen(<LearningScreen />);

    await waitFor(() => {
      expect(screen.getByText("Save certificate")).toBeTruthy();
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
      expect(screen.getByText("Finish your profile")).toBeTruthy();
    });
    expect(screen.getByText("Complete profile")).toBeTruthy();
  });
});
