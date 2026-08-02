import {
  and,
  chapters,
  courseProgress,
  courses,
  db,
  enrollments,
  eq,
  inArray,
  isNull,
  lectures,
  payments,
  sql,
  users
} from "@mma/db";

export interface EnrollmentRecord {
  /** Set when a refund withdrew the right to study. Independent of status. */
  cancelledAt: Date | null;
  completedAt: Date | null;
  courseId: string;
  createdAt: Date;
  enrolledAt: Date;
  id: string;
  status: "ACTIVE" | "COMPLETED";
  updatedAt: Date;
  userId: string;
}

export interface CourseProgressRecord {
  completedAt: Date | null;
  createdAt: Date;
  enrollmentId: string;
  id: string;
  isCompleted: boolean;
  lastViewedAt: Date | null;
  lectureId: string;
  updatedAt: Date;
}

export interface StudentEnrollmentRecord extends EnrollmentRecord {
  categoryName: string;
  categorySlug: string;
  completedLectures: number;
  courseCoverImageUrl: string | null;
  coursePrice: string;
  courseSlug: string;
  courseStatus: "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED";
  courseTitle: string;
  latestPaymentStatus: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED" | null;
  totalLectures: number;
}

function mapEnrollmentRecord(record: typeof enrollments.$inferSelect): EnrollmentRecord {
  return record;
}

function mapCourseProgressRecord(record: typeof courseProgress.$inferSelect): CourseProgressRecord {
  return record;
}

export class EnrollmentRepository {
  public async findById(id: string): Promise<EnrollmentRecord | null> {
    const [record] = await db.select().from(enrollments).where(eq(enrollments.id, id)).limit(1);

    return record ? mapEnrollmentRecord(record) : null;
  }

  public async findOwnedCertificateDetail(
    enrollmentId: string,
    userId: string
  ): Promise<{
    completedAt: Date | null;
    courseTitle: string;
    status: EnrollmentRecord["status"];
    studentName: string;
  } | null> {
    const [row] = await db
      .select({
        completedAt: enrollments.completedAt,
        courseTitle: courses.title,
        status: enrollments.status,
        studentName: users.name
      })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .innerJoin(users, eq(enrollments.userId, users.id))
      .where(and(eq(enrollments.id, enrollmentId), eq(enrollments.userId, userId)))
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      completedAt: row.completedAt,
      courseTitle: row.courseTitle,
      status: row.status,
      studentName: row.studentName
    };
  }

  public async findByUserAndCourse(
    userId: string,
    courseId: string
  ): Promise<EnrollmentRecord | null> {
    const [record] = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)))
      .limit(1);

    return record ? mapEnrollmentRecord(record) : null;
  }

  public async create(userId: string, courseId: string): Promise<EnrollmentRecord> {
    const [record] = await db
      .insert(enrollments)
      .values({
        courseId,
        userId
      })
      .returning();

    if (!record) {
      throw new Error("Failed to create enrollment");
    }

    return mapEnrollmentRecord(record);
  }

  /**
   * Grant the right to study, whether or not it was ever held before. A student
   * who was refunded and has bought the course again must get their access back
   * rather than collide with the (userId, courseId) unique index — and their
   * progress and completion are still sitting there, untouched. ADR-0001.
   */
  public async grantAccess(userId: string, courseId: string): Promise<EnrollmentRecord> {
    const [record] = await db
      .insert(enrollments)
      .values({
        courseId,
        userId
      })
      .onConflictDoUpdate({
        set: {
          cancelledAt: null,
          updatedAt: new Date()
        },
        target: [enrollments.userId, enrollments.courseId]
      })
      .returning();

    if (!record) {
      throw new Error("Failed to grant course access");
    }

    return mapEnrollmentRecord(record);
  }

  /** Withdraw the right to study. Progress and completion are left intact. */
  public async cancelById(id: string): Promise<EnrollmentRecord | null> {
    const [record] = await db
      .update(enrollments)
      .set({
        cancelledAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(enrollments.id, id))
      .returning();

    return record ? mapEnrollmentRecord(record) : null;
  }

  public async updateStatus(
    id: string,
    status: EnrollmentRecord["status"]
  ): Promise<EnrollmentRecord> {
    // completedAt is only ever set, never cleared: completion is a permanent
    // fact about what the student achieved, and a later status write must not
    // erase it. ADR-0005.
    const [record] = await db
      .update(enrollments)
      .set({
        ...(status === "COMPLETED" ? { completedAt: new Date() } : {}),
        status,
        updatedAt: new Date()
      })
      .where(eq(enrollments.id, id))
      .returning();

    if (!record) {
      throw new Error("Failed to update enrollment");
    }

    return mapEnrollmentRecord(record);
  }

  public async listByUser(userId: string): Promise<readonly StudentEnrollmentRecord[]> {
    const rows = await db
      .select({
        cancelledAt: enrollments.cancelledAt,
        categoryName: sql<string>`(select c.name from categories c where c.id = ${courses.categoryId})`,
        categorySlug: sql<string>`(select c.slug from categories c where c.id = ${courses.categoryId})`,
        completedLectures: sql<number>`(
          select count(*)
          from ${courseProgress}
          where ${courseProgress.enrollmentId} = ${enrollments.id}
            and ${courseProgress.isCompleted} = true
        )`,
        completedAt: enrollments.completedAt,
        courseCoverImageUrl: courses.coverImageUrl,
        courseId: enrollments.courseId,
        coursePrice: courses.price,
        courseSlug: courses.slug,
        courseStatus: courses.status,
        courseTitle: courses.title,
        createdAt: enrollments.createdAt,
        enrolledAt: enrollments.enrolledAt,
        id: enrollments.id,
        latestPaymentStatus: sql<StudentEnrollmentRecord["latestPaymentStatus"]>`(
          select p.status
          from ${payments} p
          where p.enrollment_id = ${enrollments.id}
          order by p.created_at desc
          limit 1
        )`,
        status: enrollments.status,
        totalLectures: sql<number>`(
          select count(*)
          from ${lectures}
          inner join ${chapters} on ${chapters.id} = ${lectures.chapterId}
          where ${chapters.courseId} = ${courses.id}
        )`,
        updatedAt: enrollments.updatedAt,
        userId: enrollments.userId
      })
      .from(enrollments)
      .innerJoin(courses, eq(courses.id, enrollments.courseId))
      .where(eq(enrollments.userId, userId))
      .orderBy(sql`${enrollments.enrolledAt} desc`);

    return rows;
  }

  public async listProgressByEnrollment(enrollmentId: string): Promise<readonly CourseProgressRecord[]> {
    const rows = await db
      .select()
      .from(courseProgress)
      .where(eq(courseProgress.enrollmentId, enrollmentId))
      .orderBy(sql`${courseProgress.createdAt} asc`);

    return rows.map(mapCourseProgressRecord);
  }

  public async findProgressByEnrollmentAndLecture(
    enrollmentId: string,
    lectureId: string
  ): Promise<CourseProgressRecord | null> {
    const [record] = await db
      .select()
      .from(courseProgress)
      .where(
        and(
          eq(courseProgress.enrollmentId, enrollmentId),
          eq(courseProgress.lectureId, lectureId)
        )
      )
      .limit(1);

    return record ? mapCourseProgressRecord(record) : null;
  }

  public async createProgress(input: {
    completedAt: Date | null;
    enrollmentId: string;
    isCompleted: boolean;
    lastViewedAt: Date | null;
    lectureId: string;
  }): Promise<CourseProgressRecord> {
    const [record] = await db
      .insert(courseProgress)
      .values({
        completedAt: input.completedAt,
        enrollmentId: input.enrollmentId,
        isCompleted: input.isCompleted,
        lastViewedAt: input.lastViewedAt,
        lectureId: input.lectureId
      })
      .returning();

    if (!record) {
      throw new Error("Failed to create course progress");
    }

    return mapCourseProgressRecord(record);
  }

  public async updateProgress(
    id: string,
    input: {
      completedAt?: Date | null | undefined;
      isCompleted?: boolean | undefined;
      lastViewedAt?: Date | null | undefined;
    }
  ): Promise<CourseProgressRecord> {
    const [record] = await db
      .update(courseProgress)
      .set({
        completedAt: input.completedAt,
        isCompleted: input.isCompleted,
        lastViewedAt: input.lastViewedAt,
        updatedAt: new Date()
      })
      .where(eq(courseProgress.id, id))
      .returning();

    if (!record) {
      throw new Error("Failed to update course progress");
    }

    return mapCourseProgressRecord(record);
  }

  public async listEnrolledUserIdsByCourse(courseId: string): Promise<readonly string[]> {
    const rows = await db
      .select({ userId: enrollments.userId })
      .from(enrollments)
      .where(
        and(eq(enrollments.courseId, courseId), inArray(enrollments.status, ["ACTIVE", "COMPLETED"]))
      );

    return [...new Set(rows.map((row) => row.userId))];
  }

  /**
   * An enrolment exists only once the right to study is real — a priced course
   * enrols on payment success, never before. So presence is access, and the
   * only further question is whether it has since been cancelled by a refund.
   * No payment join, and no course-price special case. ADR-0001.
   */
  public async hasCourseAccess(userId: string, courseId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, userId),
          eq(enrollments.courseId, courseId),
          isNull(enrollments.cancelledAt)
        )
      )
      .limit(1);

    return Boolean(row);
  }
}
