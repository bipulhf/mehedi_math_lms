import {
  and,
  chapters,
  courseTeachers,
  courses,
  count,
  db,
  enrollments,
  eq,
  inArray,
  lectures,
  payments,
  reviews,
  sql,
  studentProfiles,
  users
} from "@mma/db";

export interface TimeSeriesPoint {
  period: string;
  value: number;
}

export interface CourseCompletionRow {
  completedCount: number;
  completionRate: number;
  courseId: string;
  courseTitle: string;
  enrollmentCount: number;
}

export interface RevenueByCourseRow {
  courseId: string;
  courseTitle: string;
  revenue: number;
}

export class AnalyticsRepository {
  public async globalEnrollmentTrend(): Promise<readonly TimeSeriesPoint[]> {
    const rows = await db
      .select({
        period: sql<string>`to_char(date_trunc('month', ${enrollments.enrolledAt}), 'YYYY-MM')`,
        value: sql<number>`count(*)::int`
      })
      .from(enrollments)
      .groupBy(sql`date_trunc('month', ${enrollments.enrolledAt})`)
      .orderBy(sql`date_trunc('month', ${enrollments.enrolledAt}) desc`)
      .limit(12);

    return rows.map((row) => ({ period: row.period, value: Number(row.value) }));
  }

  public async globalRevenueTrend(): Promise<readonly TimeSeriesPoint[]> {
    const rows = await db
      .select({
        period: sql<string>`to_char(date_trunc('month', ${payments.paidAt}), 'YYYY-MM')`,
        value: sql<number>`coalesce(sum(${payments.amount}::numeric), 0)::float`
      })
      .from(payments)
      .where(and(eq(payments.status, "SUCCESS"), sql`${payments.paidAt} is not null`))
      .groupBy(sql`date_trunc('month', ${payments.paidAt})`)
      .orderBy(sql`date_trunc('month', ${payments.paidAt}) desc`)
      .limit(12);

    return rows.map((row) => ({ period: row.period, value: Number(row.value) }));
  }

  public async courseCompletionOverview(): Promise<readonly CourseCompletionRow[]> {
    const rows = await db
      .select({
        completedCount: sql<number>`count(${enrollments.id}) filter (where ${enrollments.status} = 'COMPLETED')::int`,
        courseId: courses.id,
        courseTitle: courses.title,
        enrollmentCount: sql<number>`count(${enrollments.id})::int`
      })
      .from(courses)
      .leftJoin(enrollments, eq(enrollments.courseId, courses.id))
      .where(eq(courses.status, "PUBLISHED"))
      .groupBy(courses.id, courses.title)
      .orderBy(sql`count(${enrollments.id}) desc`)
      .limit(20);

    return rows.map((row) => {
      const enrollmentCount = Number(row.enrollmentCount);
      const completedCount = Number(row.completedCount);
      const completionRate =
        enrollmentCount === 0 ? 0 : Math.round((1000 * completedCount) / enrollmentCount) / 10;

      return {
        completedCount,
        completionRate,
        courseId: row.courseId,
        courseTitle: row.courseTitle,
        enrollmentCount
      };
    });
  }

  public async studentDemographics(): Promise<readonly { count: number; label: string }[]> {
    const rows = await db
      .select({
        count: sql<number>`count(*)::int`,
        label: sql<string>`coalesce(nullif(trim(${studentProfiles.classOrGrade}), ''), 'Unspecified')`
      })
      .from(users)
      .innerJoin(studentProfiles, eq(studentProfiles.userId, users.id))
      .where(
        and(eq(users.role, "STUDENT"), eq(users.isActive, true), eq(users.banned, false))
      )
      .groupBy(
        sql`coalesce(nullif(trim(${studentProfiles.classOrGrade}), ''), 'Unspecified')`
      )
      .orderBy(sql`count(*) desc`)
      .limit(12);

    return rows.map((row) => ({
      count: Number(row.count),
      label: row.label
    }));
  }

  public async courseAnalytics(courseId: string): Promise<{
    averageRating: number;
    completedEnrollments: number;
    completionRate: number;
    enrollmentTrend: readonly TimeSeriesPoint[];
    revenueTotal: number;
    reviewCount: number;
    totalEnrollments: number;
  }> {
    const [enrollAgg] = await db
      .select({
        completedEnrollments: sql<number>`count(*) filter (where ${enrollments.status} = 'COMPLETED')::int`,
        totalEnrollments: sql<number>`count(*)::int`
      })
      .from(enrollments)
      .where(eq(enrollments.courseId, courseId));

    const [rev] = await db
      .select({
        total: sql<string>`coalesce(sum(${payments.amount}), '0')`
      })
      .from(payments)
      .innerJoin(enrollments, eq(payments.enrollmentId, enrollments.id))
      .where(and(eq(enrollments.courseId, courseId), eq(payments.status, "SUCCESS")));

    const [revAgg] = await db
      .select({
        averageRating: sql<number>`coalesce(avg(${reviews.rating})::numeric, 0)`,
        reviewCount: sql<number>`count(*)::int`
      })
      .from(reviews)
      .where(eq(reviews.courseId, courseId));

    const trendRows = await db
      .select({
        period: sql<string>`to_char(date_trunc('month', ${enrollments.enrolledAt}), 'YYYY-MM')`,
        value: sql<number>`count(*)::int`
      })
      .from(enrollments)
      .where(eq(enrollments.courseId, courseId))
      .groupBy(sql`date_trunc('month', ${enrollments.enrolledAt})`)
      .orderBy(sql`date_trunc('month', ${enrollments.enrolledAt}) desc`)
      .limit(12);

    const totalEnrollments = Number(enrollAgg?.totalEnrollments ?? 0);
    const completedEnrollments = Number(enrollAgg?.completedEnrollments ?? 0);
    const completionRate =
      totalEnrollments === 0 ? 0 : Math.round((100 * completedEnrollments) / totalEnrollments);

    return {
      averageRating: Number(revAgg?.averageRating ?? 0),
      completedEnrollments,
      completionRate,
      enrollmentTrend: trendRows.map((row) => ({ period: row.period, value: Number(row.value) })),
      revenueTotal: Number(rev?.total ?? "0"),
      reviewCount: Number(revAgg?.reviewCount ?? 0),
      totalEnrollments
    };
  }

  public async teacherCourseIds(teacherId: string): Promise<readonly string[]> {
    const created = await db
      .select({ id: courses.id })
      .from(courses)
      .where(eq(courses.creatorId, teacherId));

    const assigned = await db
      .select({ id: courseTeachers.courseId })
      .from(courseTeachers)
      .where(eq(courseTeachers.teacherId, teacherId));

    const ids = new Set<string>();

    for (const row of created) {
      ids.add(row.id);
    }

    for (const row of assigned) {
      ids.add(row.id);
    }

    return [...ids];
  }

  public async teacherOverview(teacherId: string): Promise<{
    completions: readonly CourseCompletionRow[];
    courseCount: number;
    enrollmentTrend: readonly TimeSeriesPoint[];
    lectureCount: number;
    revenueTrend: readonly TimeSeriesPoint[];
    totalEnrollments: number;
  }> {
    const courseIds = await this.teacherCourseIds(teacherId);

    if (courseIds.length === 0) {
      return {
        completions: [],
        courseCount: 0,
        enrollmentTrend: [],
        lectureCount: 0,
        revenueTrend: [],
        totalEnrollments: 0
      };
    }

    const enrollmentTrend = await db
      .select({
        period: sql<string>`to_char(date_trunc('month', ${enrollments.enrolledAt}), 'YYYY-MM')`,
        value: sql<number>`count(*)::int`
      })
      .from(enrollments)
      .where(inArray(enrollments.courseId, courseIds))
      .groupBy(sql`date_trunc('month', ${enrollments.enrolledAt})`)
      .orderBy(sql`date_trunc('month', ${enrollments.enrolledAt}) desc`)
      .limit(12);

    const revenueTrend = await db
      .select({
        period: sql<string>`to_char(date_trunc('month', ${payments.paidAt}), 'YYYY-MM')`,
        value: sql<number>`coalesce(sum(${payments.amount}::numeric), 0)::float`
      })
      .from(payments)
      .innerJoin(enrollments, eq(payments.enrollmentId, enrollments.id))
      .where(
        and(
          eq(payments.status, "SUCCESS"),
          sql`${payments.paidAt} is not null`,
          inArray(enrollments.courseId, courseIds)
        )
      )
      .groupBy(sql`date_trunc('month', ${payments.paidAt})`)
      .orderBy(sql`date_trunc('month', ${payments.paidAt}) desc`)
      .limit(12);

    const [lectureRow] = await db
      .select({ value: sql<number>`count(${lectures.id})::int` })
      .from(lectures)
      .innerJoin(chapters, eq(lectures.chapterId, chapters.id))
      .where(inArray(chapters.courseId, courseIds));

    const completionRows = await db
      .select({
        completedCount: sql<number>`count(${enrollments.id}) filter (where ${enrollments.status} = 'COMPLETED')::int`,
        courseId: courses.id,
        courseTitle: courses.title,
        enrollmentCount: sql<number>`count(${enrollments.id})::int`
      })
      .from(courses)
      .leftJoin(enrollments, eq(enrollments.courseId, courses.id))
      .where(inArray(courses.id, courseIds))
      .groupBy(courses.id, courses.title)
      .orderBy(sql`count(${enrollments.id}) desc`);

    const [totalRow] = await db
      .select({ value: count() })
      .from(enrollments)
      .where(inArray(enrollments.courseId, courseIds));

    return {
      completions: completionRows.map((row) => {
        const enrollmentCount = Number(row.enrollmentCount);
        const completedCount = Number(row.completedCount);
        const completionRate =
          enrollmentCount === 0 ? 0 : Math.round((1000 * completedCount) / enrollmentCount) / 10;

        return {
          completedCount,
          completionRate,
          courseId: row.courseId,
          courseTitle: row.courseTitle,
          enrollmentCount
        };
      }),
      courseCount: courseIds.length,
      enrollmentTrend: enrollmentTrend.map((row) => ({
        period: row.period,
        value: Number(row.value)
      })),
      lectureCount: Number(lectureRow?.value ?? 0),
      revenueTrend: revenueTrend.map((row) => ({
        period: row.period,
        value: Number(row.value)
      })),
      totalEnrollments: totalRow?.value ?? 0
    };
  }

  public async accountantOverview(): Promise<{
    paymentStatusDistribution: readonly { count: number; status: string }[];
    refundedCount: number;
    revenueByCourse: readonly RevenueByCourseRow[];
    totalRefunded: number;
    totalRevenue: number;
  }> {
    const statusRows = await db
      .select({
        count: sql<number>`count(*)::int`,
        status: payments.status
      })
      .from(payments)
      .groupBy(payments.status);

    const revenueByCourseRows = await db
      .select({
        courseId: courses.id,
        courseTitle: courses.title,
        revenue: sql<number>`coalesce(sum(${payments.amount}::numeric) filter (where ${payments.status} = 'SUCCESS'), 0)::float`
      })
      .from(payments)
      .innerJoin(enrollments, eq(payments.enrollmentId, enrollments.id))
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .groupBy(courses.id, courses.title)
      .orderBy(sql`coalesce(sum(${payments.amount}::numeric) filter (where ${payments.status} = 'SUCCESS'), 0) desc`)
      .limit(30);

    const [refundAgg] = await db
      .select({
        amount: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'REFUNDED'), '0')`,
        refundedCount: sql<number>`count(*) filter (where ${payments.status} = 'REFUNDED')::int`
      })
      .from(payments);

    const [revenueAgg] = await db
      .select({
        total: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'SUCCESS'), '0')`
      })
      .from(payments);

    return {
      paymentStatusDistribution: statusRows.map((row) => ({
        count: Number(row.count),
        status: row.status
      })),
      refundedCount: Number(refundAgg?.refundedCount ?? 0),
      revenueByCourse: revenueByCourseRows.map((row) => ({
        courseId: row.courseId,
        courseTitle: row.courseTitle,
        revenue: Number(row.revenue)
      })),
      totalRefunded: Number(refundAgg?.amount ?? "0"),
      totalRevenue: Number(revenueAgg?.total ?? "0")
    };
  }
}
