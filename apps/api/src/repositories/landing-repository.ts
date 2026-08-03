import {
  and,
  categories,
  chapters,
  count,
  courseTeachers,
  courses,
  db,
  desc,
  enrollments,
  eq,
  isNull,
  lectures,
  reviews,
  sql,
  teacherProfiles,
  users
} from "@genex/db";

export interface LandingCategoryRow {
  courseCount: number;
  description: string | null;
  icon: string | null;
  id: string;
  name: string;
  parentId: string | null;
  slug: string;
  sortOrder: number;
}

export interface LandingCourseRow {
  categoryName: string;
  categorySlug: string;
  coverImageUrl: string | null;
  description: string;
  id: string;
  lectureCount: number;
  price: string;
  publishedAt: Date | null;
  ratingAverage: number | null;
  ratingCount: number;
  slug: string;
  teacherName: string | null;
  teacherPhoto: string | null;
  teacherSlug: string | null;
  title: string;
}

export interface LandingTeacherRow {
  bio: string | null;
  courseCount: number;
  id: string;
  name: string;
  profilePhoto: string | null;
  slug: string | null;
  specializations: string | null;
  studentCount: number;
}

export interface LandingStatsRow {
  publishedCourses: number;
  ratingAverage: number | null;
  ratingCount: number;
  students: number;
  teachers: number;
}

/**
 * Reads for the public homepage. Everything here is aggregate and anonymous —
 * no route in this feature takes a session — so the numbers can be cached and
 * served to a crawler as-is.
 */
export class LandingRepository {
  public async listActiveCategories(): Promise<readonly LandingCategoryRow[]> {
    const publishedCourseCount = db
      .select({
        categoryId: courses.categoryId,
        value: count().as("value")
      })
      .from(courses)
      .where(eq(courses.status, "PUBLISHED"))
      .groupBy(courses.categoryId)
      .as("published_course_count");

    const rows = await db
      .select({
        courseCount: publishedCourseCount.value,
        description: categories.description,
        icon: categories.icon,
        id: categories.id,
        name: categories.name,
        parentId: categories.parentId,
        slug: categories.slug,
        sortOrder: categories.sortOrder
      })
      .from(categories)
      .leftJoin(publishedCourseCount, eq(publishedCourseCount.categoryId, categories.id))
      .where(eq(categories.isActive, true))
      .orderBy(categories.sortOrder, categories.name);

    return rows.map((row) => ({ ...row, courseCount: Number(row.courseCount ?? 0) }));
  }

  public async listFeaturedCourses(limit: number): Promise<readonly LandingCourseRow[]> {
    const lectureCount = db
      .select({
        courseId: chapters.courseId,
        value: count().as("value")
      })
      .from(lectures)
      .innerJoin(chapters, eq(lectures.chapterId, chapters.id))
      .groupBy(chapters.courseId)
      .as("lecture_count");

    const ratingSummary = db
      .select({
        average: sql<string>`avg(${reviews.rating})`.as("average"),
        courseId: reviews.courseId,
        value: count().as("rating_value")
      })
      .from(reviews)
      .groupBy(reviews.courseId)
      .as("rating_summary");

    // The card shows one face. `course_teacher_role` is declared OWNER-first,
    // so ascending order picks the owner, and `assignedAt` breaks the tie
    // deterministically between requests.
    const ownerTeacher = db
      .selectDistinctOn([courseTeachers.courseId], {
        courseId: courseTeachers.courseId,
        teacherId: courseTeachers.teacherId
      })
      .from(courseTeachers)
      .orderBy(courseTeachers.courseId, courseTeachers.role, courseTeachers.assignedAt)
      .as("owner_teacher");

    const rows = await db
      .select({
        categoryName: categories.name,
        categorySlug: categories.slug,
        coverImageUrl: courses.coverImageUrl,
        description: courses.description,
        id: courses.id,
        lectureCount: lectureCount.value,
        price: courses.price,
        publishedAt: courses.publishedAt,
        ratingAverage: ratingSummary.average,
        ratingCount: ratingSummary.value,
        slug: courses.slug,
        teacherName: users.name,
        teacherPhoto: teacherProfiles.profilePhoto,
        teacherSlug: users.slug,
        title: courses.title
      })
      .from(courses)
      .innerJoin(categories, eq(courses.categoryId, categories.id))
      .leftJoin(lectureCount, eq(lectureCount.courseId, courses.id))
      .leftJoin(ratingSummary, eq(ratingSummary.courseId, courses.id))
      .leftJoin(ownerTeacher, eq(ownerTeacher.courseId, courses.id))
      .leftJoin(users, eq(ownerTeacher.teacherId, users.id))
      .leftJoin(teacherProfiles, eq(teacherProfiles.userId, users.id))
      .where(eq(courses.status, "PUBLISHED"))
      .orderBy(desc(courses.publishedAt), desc(courses.createdAt))
      .limit(limit);

    return rows.map((row) => ({
      ...row,
      lectureCount: Number(row.lectureCount ?? 0),
      ratingAverage: row.ratingAverage === null ? null : Number(row.ratingAverage),
      ratingCount: Number(row.ratingCount ?? 0)
    }));
  }

  public async listFeaturedTeachers(limit: number): Promise<readonly LandingTeacherRow[]> {
    const taught = db
      .select({
        courseCount: count(courseTeachers.courseId).as("course_count"),
        studentCount: sql<string>`count(distinct ${enrollments.userId})`.as("student_count"),
        teacherId: courseTeachers.teacherId
      })
      .from(courseTeachers)
      .innerJoin(
        courses,
        and(eq(courses.id, courseTeachers.courseId), eq(courses.status, "PUBLISHED"))
      )
      .leftJoin(
        enrollments,
        and(eq(enrollments.courseId, courses.id), isNull(enrollments.cancelledAt))
      )
      .groupBy(courseTeachers.teacherId)
      .as("taught");

    const rows = await db
      .select({
        bio: teacherProfiles.bio,
        courseCount: taught.courseCount,
        id: users.id,
        name: users.name,
        profilePhoto: teacherProfiles.profilePhoto,
        slug: users.slug,
        specializations: teacherProfiles.specializations,
        studentCount: taught.studentCount
      })
      .from(taught)
      .innerJoin(
        users,
        and(eq(users.id, taught.teacherId), eq(users.isActive, true), eq(users.banned, false))
      )
      .leftJoin(teacherProfiles, eq(teacherProfiles.userId, users.id))
      .orderBy(desc(taught.studentCount), desc(taught.courseCount), users.name)
      .limit(limit);

    return rows.map((row) => ({
      ...row,
      courseCount: Number(row.courseCount ?? 0),
      studentCount: Number(row.studentCount ?? 0)
    }));
  }

  public async getStats(): Promise<LandingStatsRow> {
    const [publishedRow] = await db
      .select({ value: count() })
      .from(courses)
      .where(eq(courses.status, "PUBLISHED"));

    const [studentRow] = await db
      .select({ value: sql<string>`count(distinct ${enrollments.userId})` })
      .from(enrollments)
      .where(isNull(enrollments.cancelledAt));

    const [teacherRow] = await db
      .select({ value: count() })
      .from(users)
      .where(and(eq(users.role, "TEACHER"), eq(users.isActive, true), eq(users.banned, false)));

    const [ratingRow] = await db
      .select({
        average: sql<string | null>`avg(${reviews.rating})`,
        value: count()
      })
      .from(reviews);

    return {
      publishedCourses: Number(publishedRow?.value ?? 0),
      ratingAverage:
        ratingRow?.average === null || ratingRow?.average === undefined
          ? null
          : Number(ratingRow.average),
      ratingCount: Number(ratingRow?.value ?? 0),
      students: Number(studentRow?.value ?? 0),
      teachers: Number(teacherRow?.value ?? 0)
    };
  }
}
