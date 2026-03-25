import { and, bugReports, count, courses, db, enrollments, eq, payments, sql, users } from "@mma/db";

export interface AdminDashboardStatsRecord {
  activeCourses: number;
  openBugs: number;
  pendingCourseApprovals: number;
  revenue: number;
  totalEnrollments: number;
  totalStudents: number;
}

export class AdminDashboardRepository {
  public async getStats(): Promise<AdminDashboardStatsRecord> {
    const [studentRows, courseRows, enrollmentRows, bugRows, paymentRows] = await Promise.all([
      db
        .select({ value: count() })
        .from(users)
        .where(eq(users.role, "STUDENT")),
      db
        .select({
          activeCourses: sql<number>`count(*) filter (where ${courses.status} = 'PUBLISHED')`,
          pendingCourseApprovals: sql<number>`count(*) filter (where ${courses.status} = 'PENDING')`
        })
        .from(courses),
      db.select({ value: count() }).from(enrollments),
      db
        .select({ value: count() })
        .from(bugReports)
        .where(sql`${bugReports.status} in ('OPEN', 'IN_PROGRESS')`),
      db
        .select({
          value: sql<string>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'SUCCESS'), '0')`
        })
        .from(payments)
    ]);

    return {
      activeCourses: Number(courseRows[0]?.activeCourses ?? 0),
      openBugs: bugRows[0]?.value ?? 0,
      pendingCourseApprovals: Number(courseRows[0]?.pendingCourseApprovals ?? 0),
      revenue: Number(paymentRows[0]?.value ?? "0"),
      totalEnrollments: enrollmentRows[0]?.value ?? 0,
      totalStudents: studentRows[0]?.value ?? 0
    };
  }
}
