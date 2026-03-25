import type { UserRole } from "@mma/shared";
import type { z } from "zod";
import {
  createCourseSchema,
  listCoursesQuerySchema,
  rejectCourseSchema,
  updateCourseSchema
} from "@mma/shared";
import { courses, eq, inArray, or, type SQL } from "@mma/db";

import { CategoryRepository } from "@/repositories/category-repository";
import {
  CourseRepository,
  type CourseRecord,
  type TeacherDirectoryRecord
} from "@/repositories/course-repository";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/utils/errors";

type CreateCourseInput = z.infer<typeof createCourseSchema>;
type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
type ListCoursesQuery = z.infer<typeof listCoursesQuerySchema>;
type RejectCourseInput = z.infer<typeof rejectCourseSchema>;

export interface CourseListItem {
  category: CourseRecord["category"];
  coverImageUrl: string | null;
  createdAt: string;
  creator: CourseRecord["creator"];
  description: string;
  id: string;
  isExamOnly: boolean;
  price: string;
  publishedAt: string | null;
  rejectedAt: string | null;
  reviewFeedback: string | null;
  slug: string;
  status: CourseRecord["status"];
  submittedAt: string | null;
  teachers: CourseRecord["teachers"];
  title: string;
  updatedAt: string;
}

export interface CourseDetailResponse extends CourseListItem {}

function normalizeOptionalUrl(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function createSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `course-${crypto.randomUUID().slice(0, 8)}`
  );
}

function formatPrice(value: number): string {
  return value.toFixed(2);
}

function mapCourse(course: CourseRecord): CourseDetailResponse {
  return {
    category: course.category,
    coverImageUrl: course.coverImageUrl,
    createdAt: course.createdAt.toISOString(),
    creator: course.creator,
    description: course.description,
    id: course.id,
    isExamOnly: course.isExamOnly,
    price: course.price,
    publishedAt: course.publishedAt?.toISOString() ?? null,
    rejectedAt: course.rejectedAt?.toISOString() ?? null,
    reviewFeedback: course.reviewFeedback,
    slug: course.slug,
    status: course.status,
    submittedAt: course.submittedAt?.toISOString() ?? null,
    teachers: course.teachers,
    title: course.title,
    updatedAt: course.updatedAt.toISOString()
  };
}

export class CourseService {
  public constructor(
    private readonly courseRepository: CourseRepository,
    private readonly categoryRepository: CategoryRepository
  ) {}

  private async createUniqueSlug(title: string, excludeCourseId?: string | undefined): Promise<string> {
    const baseSlug = createSlug(title);
    let candidate = baseSlug;
    let suffix = 2;

    while (true) {
      const existingCourse = await this.courseRepository.findBySlug(candidate);

      if (!existingCourse || existingCourse.id === excludeCourseId) {
        return candidate;
      }

      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
  }

  private async validateCategory(categoryId: string): Promise<void> {
    const category = await this.categoryRepository.findById(categoryId);

    if (!category) {
      throw new ValidationError("Category not found", [
        {
          field: "categoryId",
          message: "Choose a valid category"
        }
      ]);
    }
  }

  private async validateTeachers(teacherIds: readonly string[]): Promise<void> {
    const uniqueTeacherIds = [...new Set(teacherIds)];

    if (uniqueTeacherIds.length === 0) {
      return;
    }

    const totalTeachers = await this.courseRepository.countTeachersByIds(uniqueTeacherIds);

    if (totalTeachers !== uniqueTeacherIds.length) {
      throw new ValidationError("One or more teachers are invalid", [
        {
          field: "teacherIds",
          message: "All assigned teachers must be active teacher accounts"
        }
      ]);
    }
  }

  private ensureCanManageCourse(course: CourseRecord, currentUserId: string, currentUserRole: UserRole): void {
    if (currentUserRole === "ADMIN") {
      return;
    }

    const isAssignedTeacher = course.teachers.some((teacher) => teacher.id === currentUserId);
    const isCreator = course.creator.id === currentUserId;

    if (!isAssignedTeacher && !isCreator) {
      throw new ForbiddenError("You do not have permission to manage this course");
    }
  }

  private ensureCanViewCourse(course: CourseRecord, currentUserId?: string | undefined, currentUserRole?: UserRole | undefined): void {
    if (course.status === "PUBLISHED") {
      return;
    }

    if (!currentUserId || !currentUserRole) {
      throw new NotFoundError("Course not found");
    }

    if (currentUserRole === "ADMIN") {
      return;
    }

    const isAssignedTeacher = course.teachers.some((teacher) => teacher.id === currentUserId);
    const isCreator = course.creator.id === currentUserId;

    if (!isAssignedTeacher && !isCreator) {
      throw new NotFoundError("Course not found");
    }
  }

  private ensureCanReviewCourse(course: CourseRecord): void {
    if (course.status === "ARCHIVED") {
      throw new ForbiddenError("Archived courses cannot be submitted for review");
    }

    if (course.status === "PUBLISHED") {
      throw new ForbiddenError("Published courses do not need review");
    }

    if (course.teachers.length === 0) {
      throw new ValidationError("Assign at least one teacher before submitting", [
        {
          field: "teacherIds",
          message: "Add a teacher to this course before requesting approval"
        }
      ]);
    }
  }

  public async listCourses(
    query: ListCoursesQuery,
    currentUserId?: string | undefined,
    currentUserRole?: UserRole | undefined
  ): Promise<{ items: readonly CourseListItem[]; limit: number; page: number; total: number }> {
    const isMineRequest = query.mine === true && currentUserId !== undefined;
    const effectiveStatus =
      currentUserRole === "ADMIN" || isMineRequest ? query.status : ("PUBLISHED" as const);

    let categoryId = query.categoryId;

    if (query.categorySlug) {
      const category = await this.categoryRepository.findBySlug(query.categorySlug);

      if (!category || !category.isActive) {
        return {
          items: [],
          limit: query.limit,
          page: query.page,
          total: 0
        };
      }

      categoryId = category.id;
    }

    const repositoryQuery = {
      categoryId,
      limit: query.limit,
      maxPrice: query.maxPrice,
      minPrice: query.minPrice,
      page: query.page,
      search: query.search,
      status: effectiveStatus
    };

    const extraClauses: SQL[] = [];

    if (isMineRequest) {
      const assignedCourseIds = await this.courseRepository.getAssignedCourseIds(currentUserId);

      if (assignedCourseIds.length > 0) {
        extraClauses.push(or(eq(courses.creatorId, currentUserId), inArray(courses.id, [...assignedCourseIds]))!);
      } else {
        extraClauses.push(eq(courses.creatorId, currentUserId));
      }
    }

    const result = await this.courseRepository.listCourses(repositoryQuery, extraClauses);

    return {
      items: result.items.map(mapCourse),
      limit: query.limit,
      page: query.page,
      total: result.total
    };
  }

  public async getCourseById(
    id: string,
    currentUserId?: string | undefined,
    currentUserRole?: UserRole | undefined
  ): Promise<CourseDetailResponse> {
    const course = await this.courseRepository.findById(id);

    if (!course) {
      throw new NotFoundError("Course not found");
    }

    this.ensureCanViewCourse(course, currentUserId, currentUserRole);

    return mapCourse(course);
  }

  public async getCourseBySlug(
    slug: string,
    currentUserId?: string | undefined,
    currentUserRole?: UserRole | undefined
  ): Promise<CourseDetailResponse> {
    const course = await this.courseRepository.findBySlug(slug);

    if (!course) {
      throw new NotFoundError("Course not found");
    }

    this.ensureCanViewCourse(course, currentUserId, currentUserRole);

    return mapCourse(course);
  }

  public async createCourse(
    input: CreateCourseInput,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<CourseDetailResponse> {
    if (currentUserRole !== "ADMIN" && currentUserRole !== "TEACHER") {
      throw new ForbiddenError("Only admins and teachers can create courses");
    }

    await this.validateCategory(input.categoryId);

    const createdCourse = await this.courseRepository.create({
      categoryId: input.categoryId,
      coverImageUrl: normalizeOptionalUrl(input.coverImageUrl),
      creatorId: currentUserId,
      description: input.description.trim(),
      isExamOnly: input.isExamOnly,
      price: formatPrice(input.price),
      reviewFeedback: null,
      slug: await this.createUniqueSlug(input.title),
      title: input.title.trim()
    });

    if (currentUserRole === "TEACHER") {
      await this.courseRepository.replaceTeachers(createdCourse.id, [currentUserId]);
    }

    const course = await this.courseRepository.findById(createdCourse.id);

    if (!course) {
      throw new NotFoundError("Course not found");
    }

    return mapCourse(course);
  }

  public async updateCourse(
    id: string,
    input: UpdateCourseInput,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<CourseDetailResponse> {
    const course = await this.courseRepository.findById(id);

    if (!course) {
      throw new NotFoundError("Course not found");
    }

    this.ensureCanManageCourse(course, currentUserId, currentUserRole);

    if (input.categoryId) {
      await this.validateCategory(input.categoryId);
    }

    const updatedCourse = await this.courseRepository.update(id, {
      categoryId: input.categoryId,
      coverImageUrl: input.coverImageUrl === undefined ? undefined : normalizeOptionalUrl(input.coverImageUrl),
      description: input.description?.trim(),
      isExamOnly: input.isExamOnly,
      price: input.price === undefined ? undefined : formatPrice(input.price),
      reviewFeedback: course.status === "PENDING" ? null : undefined,
      slug: input.title ? await this.createUniqueSlug(input.title, id) : undefined,
      title: input.title?.trim()
    });

    if (!updatedCourse) {
      throw new NotFoundError("Course not found");
    }

    return mapCourse(updatedCourse);
  }

  public async deleteCourse(id: string, currentUserId: string, currentUserRole: UserRole): Promise<{ id: string }> {
    const course = await this.courseRepository.findById(id);

    if (!course) {
      throw new NotFoundError("Course not found");
    }

    this.ensureCanManageCourse(course, currentUserId, currentUserRole);

    const archivedCourse = await this.courseRepository.update(id, {
      publishedAt: null,
      rejectedAt: null,
      reviewFeedback: null,
      status: "ARCHIVED",
      submittedAt: null
    });

    if (!archivedCourse) {
      throw new NotFoundError("Course not found");
    }

    return { id: archivedCourse.id };
  }

  public async submitCourse(id: string, currentUserId: string, currentUserRole: UserRole): Promise<CourseDetailResponse> {
    const course = await this.courseRepository.findById(id);

    if (!course) {
      throw new NotFoundError("Course not found");
    }

    this.ensureCanManageCourse(course, currentUserId, currentUserRole);
    this.ensureCanReviewCourse(course);

    const submittedCourse = await this.courseRepository.update(id, {
      publishedAt: null,
      rejectedAt: null,
      reviewFeedback: null,
      status: "PENDING",
      submittedAt: new Date()
    });

    if (!submittedCourse) {
      throw new NotFoundError("Course not found");
    }

    return mapCourse(submittedCourse);
  }

  public async approveCourse(id: string): Promise<CourseDetailResponse> {
    const course = await this.courseRepository.findById(id);

    if (!course) {
      throw new NotFoundError("Course not found");
    }

    if (course.status !== "PENDING") {
      throw new ConflictError("Only pending courses can be approved");
    }

    const approvedCourse = await this.courseRepository.update(id, {
      publishedAt: new Date(),
      rejectedAt: null,
      reviewFeedback: null,
      status: "PUBLISHED"
    });

    if (!approvedCourse) {
      throw new NotFoundError("Course not found");
    }

    return mapCourse(approvedCourse);
  }

  public async rejectCourse(id: string, input: RejectCourseInput): Promise<CourseDetailResponse> {
    const course = await this.courseRepository.findById(id);

    if (!course) {
      throw new NotFoundError("Course not found");
    }

    if (course.status !== "PENDING") {
      throw new ConflictError("Only pending courses can be rejected");
    }

    const rejectedCourse = await this.courseRepository.update(id, {
      publishedAt: null,
      rejectedAt: new Date(),
      reviewFeedback: input.feedback.trim(),
      status: "DRAFT",
      submittedAt: null
    });

    if (!rejectedCourse) {
      throw new NotFoundError("Course not found");
    }

    return mapCourse(rejectedCourse);
  }

  public async replaceTeachers(
    courseId: string,
    teacherIds: readonly string[],
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<CourseDetailResponse> {
    const course = await this.courseRepository.findById(courseId);

    if (!course) {
      throw new NotFoundError("Course not found");
    }

    this.ensureCanManageCourse(course, currentUserId, currentUserRole);

    const uniqueTeacherIds = [...new Set(teacherIds)];

    if (course.creator.role === "TEACHER" && !uniqueTeacherIds.includes(course.creator.id)) {
      uniqueTeacherIds.push(course.creator.id);
    }

    if (currentUserRole === "TEACHER" && !uniqueTeacherIds.includes(currentUserId)) {
      uniqueTeacherIds.push(currentUserId);
    }

    await this.validateTeachers(uniqueTeacherIds);
    await this.courseRepository.replaceTeachers(courseId, uniqueTeacherIds);

    const updatedCourse = await this.courseRepository.findById(courseId);

    if (!updatedCourse) {
      throw new NotFoundError("Course not found");
    }

    return mapCourse(updatedCourse);
  }

  public async listTeacherDirectory(search?: string | undefined): Promise<readonly TeacherDirectoryRecord[]> {
    return this.courseRepository.listTeacherDirectory(search);
  }
}
