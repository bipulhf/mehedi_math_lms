import type { UserRole } from "@mma/shared";

import { buildCacheIndex, buildCacheKey, cacheTtlSeconds, invalidateCacheIndex, readThrough } from "@/lib/cache";
import type { AnalyticsRepository } from "@/repositories/analytics-repository";
import type { CourseRepository } from "@/repositories/course-repository";
import { ForbiddenError, NotFoundError } from "@/utils/errors";

const ANALYTICS_CACHE_INDEX = buildCacheIndex("analytics");

/**
 * Aggregates over the whole enrolment and payment history are the most
 * expensive reads in the API and the least sensitive to being a few minutes
 * old. `invalidateAnalyticsCache` exists for the events that make a stale
 * dashboard actively confusing -- a payment settling, an enrolment ending.
 */
export async function invalidateAnalyticsCache(): Promise<void> {
  await invalidateCacheIndex(ANALYTICS_CACHE_INDEX);
}

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
    return readThrough({
      index: ANALYTICS_CACHE_INDEX,
      key: buildCacheKey("analytics", "admin-overview"),
      load: async () => {
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
      },
      ttlSeconds: cacheTtlSeconds.analytics
    });
  }

  public async teacherOverview(teacherId: string): Promise<
    Awaited<ReturnType<AnalyticsRepository["teacherOverview"]>>
  > {
    return readThrough({
      index: ANALYTICS_CACHE_INDEX,
      key: buildCacheKey("analytics", "teacher", teacherId),
      load: async () => this.analyticsRepository.teacherOverview(teacherId),
      ttlSeconds: cacheTtlSeconds.analytics
    });
  }

  public async accountantOverview(): Promise<
    Awaited<ReturnType<AnalyticsRepository["accountantOverview"]>>
  > {
    return readThrough({
      index: ANALYTICS_CACHE_INDEX,
      key: buildCacheKey("analytics", "accountant-overview"),
      load: async () => this.analyticsRepository.accountantOverview(),
      ttlSeconds: cacheTtlSeconds.analytics
    });
  }

  private async loadCourseAnalytics(
    courseId: string
  ): Promise<Awaited<ReturnType<AnalyticsRepository["courseAnalytics"]>>> {
    return readThrough({
      index: ANALYTICS_CACHE_INDEX,
      key: buildCacheKey("analytics", "course", courseId),
      load: async () => this.analyticsRepository.courseAnalytics(courseId),
      ttlSeconds: cacheTtlSeconds.analytics
    });
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
      return this.loadCourseAnalytics(courseId);
    }

    if (userRole === "ACCOUNTANT") {
      return this.loadCourseAnalytics(courseId);
    }

    if (userRole === "TEACHER") {
      const isManager =
        course.creator.id === userId || course.teachers.some((teacher) => teacher.id === userId);

      if (!isManager) {
        throw new ForbiddenError("You do not manage this course");
      }

      return this.loadCourseAnalytics(courseId);
    }

    throw new ForbiddenError("You do not have access to course analytics");
  }
}
