/**
 * The demo catalogue: categories, teachers, students, courses, lessons, tests,
 * enrolments, payments and reviews.
 *
 * Separate from `seed.ts` on purpose. That script creates one administrator and
 * is safe to run against production; this one invents people and takes their
 * money, and is not. It refuses to run unless `NODE_ENV` is `development`.
 *
 * Idempotent by natural key — slugs for courses and categories, emails for
 * people — so running it twice updates rather than duplicating.
 *
 * Content is deliberately mixed Bangla and English. Real courses will arrive in
 * both, and a catalogue seeded entirely in one language hides every place the
 * layout only fits the other.
 */
import { createPasswordHash, credentialAccountIssuer } from "@genex/auth/server";
import {
  accounts,
  and,
  categories,
  chapters,
  courseProgress,
  courseTeachers,
  courses,
  db,
  enrollments,
  eq,
  lectures,
  payments,
  questionOptions,
  reviews,
  studentProfiles,
  teacherProfiles,
  testQuestions,
  tests,
  users
} from "@genex/db";

import {
  DEMO_PASSWORD,
  demoCourses,
  demoStudents,
  demoSubjects,
  demoTeachers,
  levelCategories
} from "./seed-demo-fixtures";

if (process.env["NODE_ENV"] !== "development") {
  throw new Error("seed-demo-data refuses to run outside NODE_ENV=development");
}

/** Lorem Picsum serves real photographs; the seed just needs one per key. */
function photoUrl(seed: string, width: number, height: number): string {
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

async function upsertCategory(input: {
  description: string;
  name: string;
  parentId: string | null;
  slug: string;
  sortOrder: number;
}): Promise<string> {
  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, input.slug))
    .limit(1);

  const found = existing[0]?.id;

  if (found) {
    await db
      .update(categories)
      .set({ description: input.description, name: input.name, parentId: input.parentId })
      .where(eq(categories.id, found));

    return found;
  }

  const inserted = await db.insert(categories).values(input).returning({ id: categories.id });
  const row = inserted[0];

  if (!row) {
    throw new Error(`Failed to create category ${input.slug}`);
  }

  return row.id;
}

async function upsertUser(input: {
  email: string;
  image?: string | undefined;
  name: string;
  role: "STUDENT" | "TEACHER";
  slug: string;
}): Promise<string> {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  let userId = existing[0]?.id;

  if (userId) {
    await db
      .update(users)
      .set({
        image: input.image,
        name: input.name,
        profileCompleted: true,
        role: input.role,
        slug: input.slug
      })
      .where(eq(users.id, userId));
  } else {
    const inserted = await db
      .insert(users)
      .values({
        email: input.email,
        emailVerified: true,
        image: input.image,
        isActive: true,
        name: input.name,
        profileCompleted: true,
        role: input.role,
        slug: input.slug
      })
      .returning({ id: users.id });

    const row = inserted[0];

    if (!row) {
      throw new Error(`Failed to create user ${input.email}`);
    }

    userId = row.id;
  }

  const existingAccount = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .limit(1);

  if (!existingAccount[0]) {
    await db.insert(accounts).values({
      accountId: userId,
      issuer: credentialAccountIssuer,
      password: await createPasswordHash(DEMO_PASSWORD),
      providerId: "credential",
      userId
    });
  }

  return userId;
}

async function main(): Promise<void> {
  // Levels are root categories, subjects are their children. GENEX_MIGRATION.md
  // decision 2 — one tree, two axes, no new column.
  const levelIds = new Map<string, string>();

  for (const [index, level] of levelCategories.entries()) {
    levelIds.set(
      level.slug,
      await upsertCategory({ ...level, parentId: null, sortOrder: index })
    );
  }

  const subjectIds = new Map<string, string>();

  for (const [index, subject] of demoSubjects.entries()) {
    const parentId = levelIds.get(subject.levelSlug);

    if (!parentId) {
      throw new Error(`Unknown level ${subject.levelSlug} for subject ${subject.slug}`);
    }

    subjectIds.set(
      subject.slug,
      await upsertCategory({
        description: subject.description,
        name: subject.name,
        parentId,
        slug: subject.slug,
        sortOrder: index
      })
    );
  }

  const teacherIds = new Map<string, string>();

  for (const teacher of demoTeachers) {
    const userId = await upsertUser({
      email: teacher.email,
      image: photoUrl(teacher.imageSeed, 400, 400),
      name: teacher.name,
      role: "TEACHER",
      slug: teacher.slug
    });

    teacherIds.set(teacher.slug, userId);

    const existing = await db
      .select({ id: teacherProfiles.id })
      .from(teacherProfiles)
      .where(eq(teacherProfiles.userId, userId))
      .limit(1);

    const values = {
      bio: teacher.bio,
      phone: teacher.phone,
      qualifications: teacher.qualifications,
      socialLinks: teacher.socialLinks,
      specializations: teacher.specializations
    };

    if (existing[0]) {
      await db.update(teacherProfiles).set(values).where(eq(teacherProfiles.id, existing[0].id));
    } else {
      await db.insert(teacherProfiles).values({ ...values, userId });
    }
  }

  const studentIds: string[] = [];

  for (const student of demoStudents) {
    const userId = await upsertUser({
      email: student.email,
      name: student.name,
      role: "STUDENT",
      slug: student.slug
    });

    studentIds.push(userId);

    const existing = await db
      .select({ id: studentProfiles.id })
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, userId))
      .limit(1);

    const values = {
      classOrGrade: student.classOrGrade,
      institution: student.institution,
      phone: student.phone
    };

    if (existing[0]) {
      await db.update(studentProfiles).set(values).where(eq(studentProfiles.id, existing[0].id));
    } else {
      await db.insert(studentProfiles).values({ ...values, userId });
    }
  }

  for (const course of demoCourses) {
    const categoryId = subjectIds.get(course.subjectSlug);
    const creatorId = teacherIds.get(course.teacherSlug);

    if (!categoryId || !creatorId) {
      throw new Error(`Unresolved category or teacher for course ${course.slug}`);
    }

    const existing = await db
      .select({ id: courses.id })
      .from(courses)
      .where(eq(courses.slug, course.slug))
      .limit(1);

    const values = {
      categoryId,
      coverImageUrl: photoUrl(course.imageSeed, 1200, 675),
      creatorId,
      description: course.description,
      isExamOnly: course.isExamOnly,
      price: course.price,
      publishedAt: course.status === "PUBLISHED" ? new Date() : null,
      status: course.status,
      title: course.title
    };

    let courseId = existing[0]?.id;

    if (courseId) {
      await db.update(courses).set(values).where(eq(courses.id, courseId));
      // Content is rebuilt rather than diffed. Chapters cascade to lectures and
      // tests (which cascade to questions and options), so one delete clears
      // the lot and the fixtures stay the truth.
      await db.delete(chapters).where(eq(chapters.courseId, courseId));
    } else {
      const inserted = await db
        .insert(courses)
        .values({ ...values, slug: course.slug })
        .returning({ id: courses.id });

      const row = inserted[0];

      if (!row) {
        throw new Error(`Failed to create course ${course.slug}`);
      }

      courseId = row.id;
    }

    await db
      .insert(courseTeachers)
      .values({ courseId, role: "OWNER", teacherId: creatorId })
      .onConflictDoNothing();

    const lectureIds: string[] = [];

    for (const [chapterIndex, chapter] of course.chapters.entries()) {
      const insertedChapter = await db
        .insert(chapters)
        .values({ courseId, sortOrder: chapterIndex, title: chapter.title })
        .returning({ id: chapters.id });

      const chapterId = insertedChapter[0]?.id;

      if (!chapterId) {
        throw new Error(`Failed to create chapter for ${course.slug}`);
      }

      for (const [lessonIndex, lesson] of chapter.lessons.entries()) {
        const insertedLecture = await db
          .insert(lectures)
          .values({
            chapterId,
            isPreview: lesson.isPreview,
            sortOrder: lessonIndex,
            title: lesson.title,
            type: "VIDEO_LINK",
            videoDuration: lesson.durationSeconds,
            videoUrl: `https://www.youtube.com/watch?v=${lesson.youtubeVideoId}`
          })
          .returning({ id: lectures.id });

        const lectureId = insertedLecture[0]?.id;

        if (lectureId) {
          lectureIds.push(lectureId);
        }
      }

      if (chapter.test) {
        const insertedTest = await db
          .insert(tests)
          .values({
            chapterId,
            durationInMinutes: 30,
            isPublished: course.status === "PUBLISHED",
            passingScore: 40,
            sortOrder: chapterIndex,
            title: chapter.test.title,
            type: "MCQ"
          })
          .returning({ id: tests.id });

        const testId = insertedTest[0]?.id;

        if (!testId) {
          throw new Error(`Failed to create test for ${course.slug} / ${chapter.title}`);
        }

        for (const [questionIndex, question] of chapter.test.questions.entries()) {
          const insertedQuestion = await db
            .insert(testQuestions)
            .values({
              marks: 5,
              questionText: question.text,
              sortOrder: questionIndex,
              testId
            })
            .returning({ id: testQuestions.id });

          const questionId = insertedQuestion[0]?.id;

          if (!questionId) {
            throw new Error(`Failed to create question for ${course.slug} / ${chapter.test.title}`);
          }

          await db.insert(questionOptions).values(
            question.options.map((option, optionIndex) => ({
              isCorrect: option.isCorrect,
              optionText: option.text,
              questionId,
              sortOrder: optionIndex
            }))
          );
        }
      }
    }

    if (course.status !== "PUBLISHED") {
      continue;
    }

    // Enrol a slice of the students, so different courses have different
    // student counts and the dashboards are not uniformly identical.
    const enrolled = studentIds.slice(0, course.enrolledStudentCount);

    for (const [enrolledIndex, userId] of enrolled.entries()) {
      const existingEnrollment = await db
        .select({ id: enrollments.id })
        .from(enrollments)
        .where(and(eq(enrollments.courseId, courseId), eq(enrollments.userId, userId)))
        .limit(1);

      let enrollmentId = existingEnrollment[0]?.id;

      if (!enrollmentId) {
        const inserted = await db
          .insert(enrollments)
          .values({ courseId, status: "ACTIVE", userId })
          .returning({ id: enrollments.id });

        enrollmentId = inserted[0]?.id;
      }

      if (!enrollmentId) {
        continue;
      }

      // A different amount of progress per student, so a progress bar in the
      // UI has something to be at other than 0% or 100%.
      const watched = lectureIds.slice(0, ((enrolledIndex * 3) % lectureIds.length) + 1);

      for (const lectureId of watched) {
        await db
          .insert(courseProgress)
          .values({
            completedAt: new Date(),
            enrollmentId,
            isCompleted: true,
            lastViewedAt: new Date(),
            lectureId
          })
          .onConflictDoNothing();
      }

      await db
        .insert(payments)
        .values({
          amount: course.price,
          courseId,
          enrollmentId,
          paidAt: new Date(),
          provider: "SSLCOMMERZ",
          status: "SUCCESS",
          transactionId: `GENEX-DEMO-${courseId.slice(0, 8)}-${userId.slice(0, 8)}`,
          userId
        })
        .onConflictDoNothing();

      // Every other student leaves a review, cycling through a few distinct
      // comments and ratings so the averages and the copy are not identical
      // across every course. Upserted, not onConflictDoNothing: a re-run with
      // new fixture text must actually replace the old review, not skip past
      // a row that already satisfies the unique (course, user) index.
      if (enrolledIndex % 2 === 0 && course.reviewComments.length > 0) {
        const comment = course.reviewComments[enrolledIndex % course.reviewComments.length]!;
        const rating = enrolledIndex % 4 === 0 ? 5 : 4;

        await db
          .insert(reviews)
          .values({ comment, courseId, rating, userId })
          .onConflictDoUpdate({
            set: { comment, rating, updatedAt: new Date() },
            target: [reviews.courseId, reviews.userId]
          });
      }
    }
  }

  console.log(
    `Seeded ${levelCategories.length} levels, ${demoSubjects.length} subjects, ` +
      `${demoTeachers.length} teachers, ${demoStudents.length} students, ` +
      `${demoCourses.length} courses.`
  );
}

await main();
