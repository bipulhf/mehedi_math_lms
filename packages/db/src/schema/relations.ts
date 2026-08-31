import { relations } from "drizzle-orm";

import { auditLogs } from "./audit-logs";
import { bugReports } from "./bug-reports";
import { categories } from "./categories";
import { chapterMaterials, chapters } from "./chapters";
import { comments } from "./comments";
import { coupons } from "./coupons";
import { courseProgress, enrollments } from "./enrollments";
import { courseRoutines } from "./course-routines";
import { scriptChallenges } from "./script-challenges";
import { courseTeachers, courses, notices } from "./courses";
import { lectureMaterials, lectures, videoChapters } from "./lectures";
import { conversationReports, conversations, messages } from "./messages";
import { smsBatches, smsRecipients } from "./sms";
import { fcmTokens, notifications } from "./notifications";
import { payments } from "./payments";
import {
  answerMarkingLocks,
  questionImages,
  questionOptions,
  scriptPages,
  submissionAnswers,
  testQuestions,
  tests,
  testSubmissions
} from "./tests";
import { uploads } from "./uploads";
import {
  accounts,
  sessions,
  studentProfiles,
  teacherProfiles,
  users,
  verificationTokens
} from "./users";
import { reviews } from "./reviews";

export const usersRelations = relations(users, ({ many, one }) => ({
  studentProfile: one(studentProfiles, {
    fields: [users.id],
    references: [studentProfiles.userId]
  }),
  teacherProfile: one(teacherProfiles, {
    fields: [users.id],
    references: [teacherProfiles.userId]
  }),
  accounts: many(accounts),
  sessions: many(sessions),
  createdCourses: many(courses),
  courseAssignments: many(courseTeachers),
  enrollments: many(enrollments),
  payments: many(payments),
  couponsCreated: many(coupons),
  sentMessages: many(messages),
  comments: many(comments),
  notifications: many(notifications),
  fcmTokens: many(fcmTokens),
  reviews: many(reviews),
  bugReports: many(bugReports),
  uploads: many(uploads),
  gradedSubmissions: many(testSubmissions, { relationName: "graded_by_user" }),
  notices: many(notices),
  smsBatchesCreated: many(smsBatches),
  auditLogs: many(auditLogs),
  conversationOne: many(conversations, { relationName: "conversation_participant_one" }),
  conversationTwo: many(conversations, { relationName: "conversation_participant_two" })
}));

export const smsBatchesRelations = relations(smsBatches, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [smsBatches.createdByUserId],
    references: [users.id]
  }),
  course: one(courses, {
    fields: [smsBatches.courseId],
    references: [courses.id]
  }),
  recipients: many(smsRecipients)
}));

export const smsRecipientsRelations = relations(smsRecipients, ({ one }) => ({
  batch: one(smsBatches, {
    fields: [smsRecipients.batchId],
    references: [smsBatches.id]
  }),
  user: one(users, {
    fields: [smsRecipients.userId],
    references: [users.id]
  })
}));

export const uploadsRelations = relations(uploads, ({ one }) => ({
  user: one(users, {
    fields: [uploads.userId],
    references: [users.id]
  })
}));

export const studentProfilesRelations = relations(studentProfiles, ({ one }) => ({
  user: one(users, {
    fields: [studentProfiles.userId],
    references: [users.id]
  })
}));

export const teacherProfilesRelations = relations(teacherProfiles, ({ one }) => ({
  user: one(users, {
    fields: [teacherProfiles.userId],
    references: [users.id]
  })
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id]
  })
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id]
  })
}));

export const verificationTokensRelations = relations(verificationTokens, () => ({}));

export const categoriesRelations = relations(categories, ({ many, one }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "category_parent"
  }),
  children: many(categories, { relationName: "category_parent" }),
  courses: many(courses)
}));

export const coursesRelations = relations(courses, ({ many, one }) => ({
  category: one(categories, {
    fields: [courses.categoryId],
    references: [categories.id]
  }),
  creator: one(users, {
    fields: [courses.creatorId],
    references: [users.id]
  }),
  chapters: many(chapters),
  teachers: many(courseTeachers),
  enrollments: many(enrollments),
  notices: many(notices),
  reviews: many(reviews),
  coupons: many(coupons)
}));

export const courseTeachersRelations = relations(courseTeachers, ({ one }) => ({
  course: one(courses, {
    fields: [courseTeachers.courseId],
    references: [courses.id]
  }),
  teacher: one(users, {
    fields: [courseTeachers.teacherId],
    references: [users.id]
  })
}));

export const noticesRelations = relations(notices, ({ one }) => ({
  course: one(courses, {
    fields: [notices.courseId],
    references: [courses.id]
  }),
  teacher: one(users, {
    fields: [notices.teacherId],
    references: [users.id]
  })
}));

export const scriptChallengesRelations = relations(scriptChallenges, ({ one }) => ({
  assignedTeacher: one(users, {
    fields: [scriptChallenges.assignedTeacherId],
    references: [users.id]
  }),
  raisedBy: one(users, {
    fields: [scriptChallenges.raisedById],
    references: [users.id]
  }),
  submission: one(testSubmissions, {
    fields: [scriptChallenges.submissionId],
    references: [testSubmissions.id]
  })
}));

export const courseRoutinesRelations = relations(courseRoutines, ({ one }) => ({
  course: one(courses, {
    fields: [courseRoutines.courseId],
    references: [courses.id]
  }),
  updatedBy: one(users, {
    fields: [courseRoutines.updatedById],
    references: [users.id]
  })
}));

export const chaptersRelations = relations(chapters, ({ many, one }) => ({
  course: one(courses, {
    fields: [chapters.courseId],
    references: [courses.id]
  }),
  lectures: many(lectures),
  materials: many(chapterMaterials),
  tests: many(tests)
}));

export const chapterMaterialsRelations = relations(chapterMaterials, ({ one }) => ({
  chapter: one(chapters, {
    fields: [chapterMaterials.chapterId],
    references: [chapters.id]
  })
}));

export const lecturesRelations = relations(lectures, ({ many, one }) => ({
  chapter: one(chapters, {
    fields: [lectures.chapterId],
    references: [chapters.id]
  }),
  materials: many(lectureMaterials),
  comments: many(comments),
  progress: many(courseProgress),
  videoChapters: many(videoChapters)
}));

export const videoChaptersRelations = relations(videoChapters, ({ one }) => ({
  lecture: one(lectures, {
    fields: [videoChapters.lectureId],
    references: [lectures.id]
  })
}));

export const lectureMaterialsRelations = relations(lectureMaterials, ({ one }) => ({
  lecture: one(lectures, {
    fields: [lectureMaterials.lectureId],
    references: [lectures.id]
  })
}));

export const testsRelations = relations(tests, ({ many, one }) => ({
  chapter: one(chapters, {
    fields: [tests.chapterId],
    references: [chapters.id]
  }),
  questions: many(testQuestions),
  submissions: many(testSubmissions)
}));

export const testQuestionsRelations = relations(testQuestions, ({ many, one }) => ({
  test: one(tests, {
    fields: [testQuestions.testId],
    references: [tests.id]
  }),
  options: many(questionOptions),
  images: many(questionImages),
  submissionAnswers: many(submissionAnswers)
}));

export const questionImagesRelations = relations(questionImages, ({ one }) => ({
  question: one(testQuestions, {
    fields: [questionImages.questionId],
    references: [testQuestions.id]
  }),
  upload: one(uploads, {
    fields: [questionImages.uploadId],
    references: [uploads.id]
  })
}));

export const questionOptionsRelations = relations(questionOptions, ({ many, one }) => ({
  question: one(testQuestions, {
    fields: [questionOptions.questionId],
    references: [testQuestions.id]
  }),
  submissionAnswers: many(submissionAnswers)
}));

export const testSubmissionsRelations = relations(testSubmissions, ({ many, one }) => ({
  test: one(tests, {
    fields: [testSubmissions.testId],
    references: [tests.id]
  }),
  user: one(users, {
    fields: [testSubmissions.userId],
    references: [users.id]
  }),
  gradedBy: one(users, {
    fields: [testSubmissions.gradedById],
    references: [users.id],
    relationName: "graded_by_user"
  }),
  answers: many(submissionAnswers)
}));

export const submissionAnswersRelations = relations(submissionAnswers, ({ many, one }) => ({
  submission: one(testSubmissions, {
    fields: [submissionAnswers.submissionId],
    references: [testSubmissions.id]
  }),
  question: one(testQuestions, {
    fields: [submissionAnswers.questionId],
    references: [testQuestions.id]
  }),
  selectedOption: one(questionOptions, {
    fields: [submissionAnswers.selectedOptionId],
    references: [questionOptions.id]
  }),
  scriptPages: many(scriptPages),
  markingLock: one(answerMarkingLocks, {
    fields: [submissionAnswers.id],
    references: [answerMarkingLocks.submissionAnswerId]
  })
}));

export const scriptPagesRelations = relations(scriptPages, ({ one }) => ({
  answer: one(submissionAnswers, {
    fields: [scriptPages.submissionAnswerId],
    references: [submissionAnswers.id]
  }),
  upload: one(uploads, {
    fields: [scriptPages.uploadId],
    references: [uploads.id]
  })
}));

export const answerMarkingLocksRelations = relations(answerMarkingLocks, ({ one }) => ({
  answer: one(submissionAnswers, {
    fields: [answerMarkingLocks.submissionAnswerId],
    references: [submissionAnswers.id]
  }),
  lockedBy: one(users, {
    fields: [answerMarkingLocks.lockedById],
    references: [users.id]
  })
}));

export const enrollmentsRelations = relations(enrollments, ({ many, one }) => ({
  user: one(users, {
    fields: [enrollments.userId],
    references: [users.id]
  }),
  course: one(courses, {
    fields: [enrollments.courseId],
    references: [courses.id]
  }),
  payments: many(payments),
  progress: many(courseProgress)
}));

export const courseProgressRelations = relations(courseProgress, ({ one }) => ({
  enrollment: one(enrollments, {
    fields: [courseProgress.enrollmentId],
    references: [enrollments.id]
  }),
  lecture: one(lectures, {
    fields: [courseProgress.lectureId],
    references: [lectures.id]
  })
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  coupon: one(coupons, {
    fields: [payments.couponId],
    references: [coupons.id]
  }),
  enrollment: one(enrollments, {
    fields: [payments.enrollmentId],
    references: [enrollments.id]
  }),
  user: one(users, {
    fields: [payments.userId],
    references: [users.id]
  })
}));

export const couponsRelations = relations(coupons, ({ many, one }) => ({
  course: one(courses, {
    fields: [coupons.courseId],
    references: [courses.id]
  }),
  createdBy: one(users, {
    fields: [coupons.createdById],
    references: [users.id]
  }),
  // Redemptions live on the payments themselves. ADR-0013.
  payments: many(payments)
}));

export const conversationsRelations = relations(conversations, ({ many, one }) => ({
  participantOne: one(users, {
    fields: [conversations.participantOneId],
    references: [users.id],
    relationName: "conversation_participant_one"
  }),
  participantTwo: one(users, {
    fields: [conversations.participantTwoId],
    references: [users.id],
    relationName: "conversation_participant_two"
  }),
  messages: many(messages)
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id]
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id]
  })
}));

export const conversationReportsRelations = relations(conversationReports, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationReports.conversationId],
    references: [conversations.id]
  }),
  reporter: one(users, {
    fields: [conversationReports.reporterId],
    references: [users.id],
    relationName: "conversation_report_reporter"
  })
}));

export const commentsRelations = relations(comments, ({ many, one }) => ({
  lecture: one(lectures, {
    fields: [comments.lectureId],
    references: [lectures.id]
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id]
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "comment_parent"
  }),
  replies: many(comments, { relationName: "comment_parent" })
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id]
  })
}));

export const fcmTokensRelations = relations(fcmTokens, ({ one }) => ({
  user: one(users, {
    fields: [fcmTokens.userId],
    references: [users.id]
  })
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  course: one(courses, {
    fields: [reviews.courseId],
    references: [courses.id]
  }),
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id]
  })
}));

export const bugReportsRelations = relations(bugReports, ({ one }) => ({
  user: one(users, {
    fields: [bugReports.userId],
    references: [users.id]
  })
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorId],
    references: [users.id]
  })
}));
