/**
 * Every query key in one place, so invalidation after a mutation can be written
 * against a name rather than a hand-typed array that silently stops matching.
 *
 * Keys are hierarchical: invalidating `courses.all()` also invalidates every
 * `courses.list(...)` and `courses.detail(...)` beneath it.
 */
export const queryKeys = {
  admin: {
    all: () => ["admin"] as const,
    bug: (bugId: string) => ["admin", "bugs", bugId] as const,
    bugs: (filters: Record<string, unknown>) => ["admin", "bugs", filters] as const,
    courses: (filters: Record<string, unknown>) => ["admin", "courses", filters] as const,
    dashboard: () => ["admin", "dashboard"] as const,
    smsHistory: (filters: Record<string, unknown>) => ["admin", "sms", filters] as const,
    user: (userId: string) => ["admin", "users", userId] as const,
    users: (filters: Record<string, unknown>) => ["admin", "users", filters] as const
  },
  analytics: {
    accountant: () => ["analytics", "accountant"] as const,
    admin: () => ["analytics", "admin"] as const,
    all: () => ["analytics"] as const,
    course: (courseId: string) => ["analytics", "course", courseId] as const,
    teacher: () => ["analytics", "teacher"] as const
  },
  bugs: {
    all: () => ["bugs"] as const,
    mine: () => ["bugs", "mine"] as const
  },
  categories: {
    all: () => ["categories"] as const,
    list: (filters: Record<string, unknown> = {}) => ["categories", "list", filters] as const
  },
  comments: {
    all: () => ["comments"] as const,
    lecture: (lectureId: string) => ["comments", "lecture", lectureId] as const
  },
  content: {
    all: () => ["content"] as const,
    course: (courseId: string) => ["content", "course", courseId] as const
  },
  courses: {
    all: () => ["courses"] as const,
    detail: (courseId: string) => ["courses", "detail", courseId] as const,
    list: (filters: Record<string, unknown> = {}) => ["courses", "list", filters] as const,
    mine: (filters: Record<string, unknown> = {}) => ["courses", "mine", filters] as const,
    teacherDirectory: (search: string) => ["courses", "teacher-directory", search] as const
  },
  enrollments: {
    all: () => ["enrollments"] as const,
    course: (courseId: string) => ["enrollments", "course", courseId] as const,
    mine: () => ["enrollments", "mine"] as const
  },
  messages: {
    all: () => ["messages"] as const,
    conversations: (search: string) => ["messages", "conversations", search] as const,
    participants: (search: string) => ["messages", "participants", search] as const,
    thread: (conversationId: string) => ["messages", "thread", conversationId] as const
  },
  moderation: {
    all: () => ["moderation"] as const,
    reports: () => ["moderation", "reports"] as const,
    thread: (conversationId: string) => ["moderation", "thread", conversationId] as const
  },
  notices: {
    all: () => ["notices"] as const,
    course: (courseId: string) => ["notices", "course", courseId] as const
  },
  notifications: {
    all: () => ["notifications"] as const,
    list: (filters: Record<string, unknown> = {}) => ["notifications", "list", filters] as const,
    unreadCount: () => ["notifications", "unread-count"] as const
  },
  payments: {
    all: () => ["payments"] as const,
    detail: (paymentId: string) => ["payments", "detail", paymentId] as const,
    list: (filters: Record<string, unknown> = {}) => ["payments", "list", filters] as const
  },
  profiles: {
    all: () => ["profiles"] as const,
    me: () => ["profiles", "me"] as const,
    student: (studentId: string) => ["profiles", "student", studentId] as const,
    teachers: () => ["profiles", "teachers"] as const
  },
  reviews: {
    all: () => ["reviews"] as const,
    course: (courseId: string) => ["reviews", "course", courseId] as const
  },
  progress: {
    all: () => ["progress"] as const,
    course: (courseId: string) => ["progress", "course", courseId] as const
  },
  tests: {
    all: () => ["tests"] as const,
    byCourse: (courseId: string) => ["tests", "course", courseId] as const,
    detail: (testId: string) => ["tests", "detail", testId] as const,
    submission: (submissionId: string) => ["tests", "submission", submissionId] as const,
    submissions: (testId: string) => ["tests", "submissions", testId] as const
  }
} as const;
