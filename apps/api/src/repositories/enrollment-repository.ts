import {
  and,
  chapters,
  courseProgress,
  courses,
  db,
  enrollments,
  eq,
  lectures,
  payments,
  sql
} from "@mma/db";

export interface EnrollmentRecord {
  completedAt: Date | null;
  courseId: string;
  createdAt: Date;
  enrolledAt: Date;
  id: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  updatedAt: Date;
  userId: string;
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

export class EnrollmentRepository {
  public async findById(id: string): Promise<EnrollmentRecord | null> {
    const [record] = await db.select().from(enrollments).where(eq(enrollments.id, id)).limit(1);

    return record ? mapEnrollmentRecord(record) : null;
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

  public async updateStatus(
    id: string,
    status: EnrollmentRecord["status"]
  ): Promise<EnrollmentRecord> {
    const [record] = await db
      .update(enrollments)
      .set({
        completedAt: status === "COMPLETED" ? new Date() : null,
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

  public async hasCourseAccess(userId: string, courseId: string): Promise<boolean> {
    const [row] = await db
      .select({
        canAccess: sql<number>`(
          case
            when exists (
              select 1
              from ${enrollments} e
              where e.user_id = ${userId}
                and e.course_id = ${courseId}
                and e.status in ('ACTIVE', 'COMPLETED')
                and (
                  exists (
                    select 1
                    from ${courses} c
                    where c.id = ${courseId}
                      and c.price::numeric <= 0
                  )
                  or exists (
                    select 1
                    from ${payments} p
                    where p.enrollment_id = e.id
                      and p.status = 'SUCCESS'
                  )
                )
            ) then 1 else 0
          end
        )`
      })
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    return (row?.canAccess ?? 0) > 0;
  }
}
