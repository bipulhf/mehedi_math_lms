import type { Context } from "hono";
import type { CourseReviewsQuery, CreateCourseReviewInput, UserRole } from "@mma/shared";

import { ReviewService } from "@/services/review-service";
import type { AppBindings } from "@/types/app-bindings";
import { paginated, success } from "@/utils/response";

export class ReviewController {
  public constructor(private readonly reviewService: ReviewService) {}

  public async listForCourse(
    context: Context<AppBindings>,
    courseId: string,
    query: CourseReviewsQuery
  ): Promise<Response> {
    const result = await this.reviewService.listForCourse(courseId, query);

    return paginated(context, result.items, {
      limit: result.limit,
      page: result.page,
      pages: Math.ceil(result.total / result.limit) || 1,
      total: result.total
    });
  }

  public async summaryForCourse(context: Context<AppBindings>, courseId: string): Promise<Response> {
    const data = await this.reviewService.getAggregatePublic(courseId);

    return success(context, data);
  }

  public async create(
    context: Context<AppBindings>,
    courseId: string,
    payload: CreateCourseReviewInput,
    userId: string,
    userRole: UserRole
  ): Promise<Response> {
    const data = await this.reviewService.createReview(courseId, payload, userId, userRole);

    return success(context, data, 201, "Review submitted");
  }
}
