import type { UserRole } from "@mma/shared";

import { AnalyticsRepository } from "@/repositories/analytics-repository";
import { CourseRepository } from "@/repositories/course-repository";
import { ForbiddenError, NotFoundError } from "@/utils/errors";

export class AnalyticsService {
  public constructor(
    private readonly analyticsRepository: AnalyticsRepository,
    private readonly courseRepository: CourseRepository
  ) {}

  public async adminOverview(): Promise<{
    completions: Awaited<ReturnType<AnalyticsRepository["courseCompletionOverview"]>>;
    demographics: Awaited<ReturnType<AnalyticsRepository["studentDemographics"]>>;
    enrollmentTrend: Awaited<ReturnType<AnalyticsRepository["globalEnrollmentTrend"]>>;
    revenueTrend: Awaited<ReturnType<AnalyticsRepository["globalRevenueTrend"]>>;
  }> {
    const [enrollmentTrend, revenueTrend, completions, demographics] = await Promise.all([
      this.analyticsRepository.globalEnrollmentTrend(),
      this.analyticsRepository.globalRevenueTrend(),
      this.analyticsRepository.courseCompletionOverview(),
      this.analyticsRepository.studentDemographics()
    ]);

    return {
      completions,
      demographics,
      enrollmentTrend,
      revenueTrend
    };
  }

  public async teacherOverview(teacherId: string): Promise<
    Awaited<ReturnType<AnalyticsRepository["teacherOverview"]>>
  > {
    return this.analyticsRepository.teacherOverview(teacherId);
  }

  public async accountantOverview(): Promise<
    Awaited<ReturnType<AnalyticsRepository["accountantOverview"]>>
  > {
    return this.analyticsRepository.accountantOverview();
  }

  public async courseAnalytics(
    courseId: string,
    userId: string,
    userRole: UserRole
  ): Promise<Awaited<ReturnType<AnalyticsRepository["courseAnalytics"]>>> {
    const course = await this.courseRepository.findById(courseId);

    if (!course) {
      throw new NotFoundError("Course not found");
    }

    if (userRole === "ADMIN") {
      return this.analyticsRepository.courseAnalytics(courseId);
    }

    if (userRole === "ACCOUNTANT") {
      return this.analyticsRepository.courseAnalytics(courseId);
    }

    if (userRole === "TEACHER") {
      const isManager =
        course.creator.id === userId || course.teachers.some((teacher) => teacher.id === userId);

      if (!isManager) {
        throw new ForbiddenError("You do not manage this course");
      }

      return this.analyticsRepository.courseAnalytics(courseId);
    }

    throw new ForbiddenError("You do not have access to course analytics");
  }
}
