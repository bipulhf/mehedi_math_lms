import type { CourseReviewsQuery, CreateCourseReviewInput, UserRole } from "@mma/shared";

import { CourseRepository } from "@/repositories/course-repository";
import { EnrollmentRepository } from "@/repositories/enrollment-repository";
import { ReviewRepository, type ReviewWithAuthor } from "@/repositories/review-repository";
import { ForbiddenError, NotFoundError, ValidationError } from "@/utils/errors";

export interface ReviewView {
  authorName: string;
  comment: string | null;
  createdAt: string;
  id: string;
  rating: number;
  userId: string;
}

export class ReviewService {
  public constructor(
    private readonly reviewRepository: ReviewRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly courseRepository: CourseRepository
  ) {}

  public async listForCourse(
    courseId: string,
    query: CourseReviewsQuery
  ): Promise<{ items: readonly ReviewView[]; limit: number; page: number; total: number }> {
    const course = await this.courseRepository.findById(courseId);

    if (!course || course.status !== "PUBLISHED") {
      throw new NotFoundError("Course not found");
    }

    const result = await this.reviewRepository.listByCourseId(courseId, {
      limit: query.limit,
      page: query.page
    });

    return {
      items: result.items.map((row) => this.mapReview(row)),
      limit: query.limit,
      page: query.page,
      total: result.total
    };
  }

  public async getAggregatePublic(courseId: string): Promise<{ average: number; count: number }> {
    const course = await this.courseRepository.findById(courseId);

    if (!course || course.status !== "PUBLISHED") {
      throw new NotFoundError("Course not found");
    }

    return this.reviewRepository.getAggregateForCourse(courseId);
  }

  public async createReview(
    courseId: string,
    input: CreateCourseReviewInput,
    userId: string,
    userRole: UserRole
  ): Promise<ReviewView> {
    if (userRole !== "STUDENT") {
      throw new ForbiddenError("Only students can submit course reviews");
    }

    const course = await this.courseRepository.findById(courseId);

    if (!course || course.status !== "PUBLISHED") {
      throw new NotFoundError("Course not found");
    }

    const enrollment = await this.enrollmentRepository.findByUserAndCourse(userId, courseId);

    if (!enrollment || enrollment.status !== "COMPLETED") {
      throw new ValidationError("You can review a course only after completing it");
    }

    const existing = await this.reviewRepository.findByUserAndCourse(courseId, userId);

    if (existing) {
      throw new ValidationError("You have already reviewed this course");
    }

    const comment =
      input.comment && input.comment.trim().length > 0 ? input.comment.trim() : null;

    await this.reviewRepository.create({
      comment,
      courseId,
      rating: input.rating,
      userId
    });

    const list = await this.reviewRepository.listByCourseId(courseId, { limit: 1, page: 1 });
    const mine = list.items.find((item) => item.userId === userId);

    if (!mine) {
      throw new Error("Failed to load review");
    }

    return this.mapReview(mine);
  }

  private mapReview(row: ReviewWithAuthor): ReviewView {
    return {
      authorName: row.authorName,
      comment: row.comment,
      createdAt: row.createdAt.toISOString(),
      id: row.id,
      rating: row.rating,
      userId: row.userId
    };
  }
}
