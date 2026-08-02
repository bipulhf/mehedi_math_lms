import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ApiError } from "@/src/lib/api-client";

/** Every key the app queries by, so an invalidation cannot drift from its query. */
export const queryKeys = {
  bugReports: () => ["bugs", "mine"] as const,
  categories: () => ["categories"] as const,
  conversation: (conversationId: string) => ["messages", "thread", conversationId] as const,
  conversations: () => ["messages", "conversations"] as const,
  course: (courseId: string) => ["courses", courseId] as const,
  courseContent: (courseId: string) => ["content", courseId] as const,
  courseNotices: (courseId: string) => ["notices", courseId] as const,
  courseProgress: (courseId: string) => ["progress", courseId] as const,
  courseReviewSummary: (courseId: string) => ["reviews", "summary", courseId] as const,
  courseReviews: (courseId: string) => ["reviews", courseId] as const,
  courseTests: (courseId: string) => ["tests", "course", courseId] as const,
  courses: (filters: Record<string, unknown>) => ["courses", "list", filters] as const,
  enrollment: (courseId: string) => ["enrollments", courseId] as const,
  enrollments: () => ["enrollments", "mine"] as const,
  lectureComments: (lectureId: string) => ["comments", lectureId] as const,
  notifications: () => ["notifications"] as const,
  profile: () => ["profile"] as const,
  // Owned by `use-session.ts`, but named here because completing a profile
  // changes the session's `profileCompleted` flag and has to invalidate it.
  session: () => ["session"] as const,
  test: (testId: string) => ["tests", testId] as const,
  unreadNotifications: () => ["notifications", "unread"] as const
} as const;

export function createMobileQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: {
        // A day, because the cache is persisted and a commuter opening the app
        // underground should still see their courses.
        gcTime: 24 * 60 * 60 * 1000,
        retry: (failureCount, error) => {
          // A dropped connection is worth retrying — a phone regains signal on
          // its own. A 4xx is not: the answer will be the same.
          if (error instanceof ApiError && !error.isOffline && error.status < 500) {
            return false;
          }

          return failureCount < 2;
        },
        staleTime: 60 * 1000
      }
    }
  });
}

/**
 * Offline-first: the cache is written to AsyncStorage and restored on launch,
 * so the app opens with content rather than skeletons on a cold start.
 */
export const asyncStoragePersister = createAsyncStoragePersister({
  key: "mma.query-cache",
  storage: AsyncStorage,
  throttleTime: 2_000
});
