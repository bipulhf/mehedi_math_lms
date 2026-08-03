import type { UserRole ,
  createCourseSchema,
  listCoursesQuerySchema,
  rejectCourseSchema,
  updateCourseSchema
} from "@genex/shared";
import type { z } from "zod";
import {
  generateUniqueSlug
} from "@genex/shared";
import { courses, eq, inArray, or, type SQL } from "@genex/db";

import { buildCacheIndex, buildCacheKey, cacheTtlSeconds, invalidateCacheIndex, readThrough } from "@/lib/cache";
import type { CategoryRepository } from "@/repositories/category-repository";
import type {
  CourseRepository} from "@/repositories/course-repository";
import {
  type CourseRecord,
  type TeacherDirectoryRecord
} from "@/repositories/course-repository";
import type { NotificationService } from "@/services/notification-service";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/utils/errors";

type CreateCourseInput = z.infer<typeof createCourseSchema>;
type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
type ListCoursesQuery = z.infer<typeof listCoursesQuerySchema>;
type RejectCourseInput = z.infer<typeof rejectCourseSchema>;

/** Every cached catalogue page hangs off one index, because any course change can reorder any page. */
const COURSE_CACHE_INDEX = buildCacheIndex("courses");

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
  stats: CourseRecord["stats"];
  status: CourseRecord["status"];
  submittedAt: string | null;
  teachers: CourseRecord["teachers"];
  title: string;
  updatedAt: string;
}

export type CourseDetailResponse = CourseListItem;

function normalizeOptionalUrl(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
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
    stats: course.stats,
    submittedAt: course.submittedAt?.toISOString() ?? null,
    teachers: course.teachers,
    title: course.title,
    updatedAt: course.updatedAt.toISOString()
  };
}

export class CourseService {
  public constructor(
    private readonly courseRepository: CourseRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly notificationService: NotificationService
  ) {}

  private async createUniqueSlug(
    title: string,
    excludeCourseId?: string | undefined
  ): Promise<string> {
    return generateUniqueSlug(title, async (candidate) => {
      const existingCourse = await this.courseRepository.findBySlug(candidate);

      return existingCourse !== null && existingCourse.id !== excludeCourseId;
    });
  }

  /** Any change to a course can reorder or repopulate any catalogue page. */
  private async invalidateCourseCache(): Promise<void> {
    await invalidateCacheIndex(COURSE_CACHE_INDEX);
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

  /**
   * Content work: chapters, lectures, materials, tests, notices. Any teacher on
   * the roster, plus an Admin. ADR-0006.
   */
  private ensureCanEditContent(
    course: CourseRecord,
    currentUserId: string,
    currentUserRole: UserRole
  ): void {
    if (currentUserRole === "ADMIN") {
      return;
    }

    const isOnRoster = course.teachers.some((teacher) => teacher.id === currentUserId);

    if (!isOnRoster) {
      throw new ForbiddenError("You do not have permission to manage this course");
    }
  }

  /**
   * Authority over the course itself: who teaches it, its price, whether it
   * goes for approval, and whether it is withdrawn or restored. Owners and
   * Admins only — a teacher invited to help with content cannot rewrite the
   * roster or pull the course from the catalog. ADR-0006.
   */
  private ensureCanAdministerCourse(
    course: CourseRecord,
    currentUserId: string,
    currentUserRole: UserRole
  ): void {
    if (currentUserRole === "ADMIN") {
      return;
    }

    const isOwner = course.teachers.some(
      (teacher) => teacher.id === currentUserId && teacher.role === "OWNER"
    );

    if (!isOwner) {
      throw new ForbiddenError("Only a course owner can administer this course");
    }
  }

  private ensureCanViewCourse(
    course: CourseRecord,
    currentUserId?: string | undefined,
    currentUserRole?: UserRole | undefined
  ): void {
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
      // Restore it first; that is what routes a withdrawn course back through
      // approval, rather than letting it skip straight to review.
      throw new ForbiddenError("Restore this course before submitting it for review");
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

  /**
   * An Exam-Only Course is sold as assessment alone: its chapters hold Tests
   * and no Lectures. Enforced at approval so the badge on the catalog is always
   * truthful, and so an ordinary course cannot ship with nothing to watch.
   */
  private async ensureContentMatchesCourseFormat(course: CourseRecord): Promise<void> {
    const lectureCount = await this.courseRepository.countLecturesByCourseId(course.id);

    if (course.isExamOnly && lectureCount > 0) {
      throw new ValidationError("An exam-only course cannot contain lectures", [
        {
          field: "isExamOnly",
          message: `Remove the ${lectureCount} lecture(s) from this course, or turn off exam-only`
        }
      ]);
    }

    if (!course.isExamOnly && lectureCount === 0) {
      throw new ValidationError("Add a lecture before submitting this course", [
        {
          field: "lectures",
          message: "A course with no lectures must be marked exam-only"
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
      hasFreeLesson: query.hasFreeLesson,
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
        extraClauses.push(
          or(eq(courses.creatorId, currentUserId), inArray(courses.id, [...assignedCourseIds]))!
        );
      } else {
        extraClauses.push(eq(courses.creatorId, currentUserId));
      }
    }

    // Only the public catalogue is cached. "Mine" and the admin view are
    // per-user and carry unpublished courses, which must never be shared.
    const isPublicCatalogue = !isMineRequest && effectiveStatus === "PUBLISHED";
    const load = async (): Promise<Awaited<ReturnType<CourseRepository["listCourses"]>>> =>
      this.courseRepository.listCourses(repositoryQuery, extraClauses);
    const result = isPublicCatalogue
      ? await readThrough({
          index: COURSE_CACHE_INDEX,
          key: buildCacheKey(
            "courses",
            "catalogue",
            repositoryQuery.categoryId,
            repositoryQuery.minPrice,
            repositoryQuery.maxPrice,
            repositoryQuery.search,
            repositoryQuery.hasFreeLesson,
            repositoryQuery.page,
            repositoryQuery.limit
          ),
          load,
          ttlSeconds: cacheTtlSeconds.courses
        })
      : await load();

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
      // A teacher owns what they create; an admin-created course gets its owner
      // when teachers are first assigned. ADR-0006.
      ownerTeacherId: currentUserRole === "TEACHER" ? currentUserId : null,
      categoryId: input.categoryId,
      coverImageUrl: normalizeOptionalUrl(input.coverImageUrl),
      creatorId: currentUserId,
      description: input.description.trim(),
      isExamOnly: input.isExamOnly,
      price: formatPrice(input.price),
      reviewFeedback: null,
      slug: await this.createUniqueSlug(input.title.trim()),
      title: input.title.trim()
    });

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

    this.ensureCanAdministerCourse(course, currentUserId, currentUserRole);

    if (input.categoryId) {
      await this.validateCategory(input.categoryId);
    }

    // Turning exam-only on cannot be allowed to make the flag a lie about
    // content that already exists.
    if (input.isExamOnly === true && !course.isExamOnly) {
      const lectureCount = await this.courseRepository.countLecturesByCourseId(course.id);

      if (lectureCount > 0) {
        throw new ValidationError("This course already contains lectures", [
          {
            field: "isExamOnly",
            message: `Remove the ${lectureCount} lecture(s) before marking this course exam-only`
          }
        ]);
      }
    }

    const trimmedTitle = input.title?.trim();
    const shouldRegenerateSlug = trimmedTitle !== undefined && trimmedTitle !== course.title;

    const updatedCourse = await this.courseRepository.update(id, {
      categoryId: input.categoryId,
      coverImageUrl:
        input.coverImageUrl === undefined ? undefined : normalizeOptionalUrl(input.coverImageUrl),
      description: input.description?.trim(),
      isExamOnly: input.isExamOnly,
      price: input.price === undefined ? undefined : formatPrice(input.price),
      reviewFeedback: course.status === "PENDING" ? null : undefined,
      slug: shouldRegenerateSlug ? await this.createUniqueSlug(trimmedTitle, id) : undefined,
      title: trimmedTitle
    });

    if (!updatedCourse) {
      throw new NotFoundError("Course not found");
    }

    await this.invalidateCourseCache();

    return mapCourse(updatedCourse);
  }

  /**
   * Pull a course from the catalog. It can no longer be found or enrolled in,
   * but everyone already enrolled keeps access — nothing checks course status
   * for that. Reversible via restoreCourse.
   */
  public async withdrawCourse(
    id: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<{ id: string }> {
    const course = await this.courseRepository.findById(id);

    if (!course) {
      throw new NotFoundError("Course not found");
    }

    this.ensureCanAdministerCourse(course, currentUserId, currentUserRole);

    if (course.status === "ARCHIVED") {
      throw new ConflictError("Course is already withdrawn");
    }

    const withdrawnCourse = await this.courseRepository.update(id, {
      publishedAt: null,
      rejectedAt: null,
      reviewFeedback: null,
      status: "ARCHIVED",
      submittedAt: null
    });

    if (!withdrawnCourse) {
      throw new NotFoundError("Course not found");
    }

    await this.invalidateCourseCache();

    return { id: withdrawnCourse.id };
  }

  /**
   * Bring a withdrawn course back as a Draft. It does not return to the catalog
   * directly — it must pass admin approval again before it can take new
   * enrolments, because the reason it was withdrawn may still stand.
   */
  public async restoreCourse(
    id: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<CourseDetailResponse> {
    const course = await this.courseRepository.findById(id);

    if (!course) {
      throw new NotFoundError("Course not found");
    }

    this.ensureCanAdministerCourse(course, currentUserId, currentUserRole);

    if (course.status !== "ARCHIVED") {
      throw new ConflictError("Only a withdrawn course can be restored");
    }

    const restoredCourse = await this.courseRepository.update(id, {
      publishedAt: null,
      rejectedAt: null,
      reviewFeedback: null,
      status: "DRAFT",
      submittedAt: null
    });

    if (!restoredCourse) {
      throw new NotFoundError("Course not found");
    }

    await this.invalidateCourseCache();

    return mapCourse(restoredCourse);
  }

  public async submitCourse(
    id: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<CourseDetailResponse> {
    const course = await this.courseRepository.findById(id);

    if (!course) {
      throw new NotFoundError("Course not found");
    }

    this.ensureCanAdministerCourse(course, currentUserId, currentUserRole);
    this.ensureCanReviewCourse(course);
    await this.ensureContentMatchesCourseFormat(course);

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

    await this.invalidateCourseCache();

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

    await this.invalidateCourseCache();

    await this.notificationService.notifyUsers(
      approvedCourse.teachers.map((teacher) => teacher.id),
      {
        body: `${approvedCourse.title} is now published in the catalog.`,
        data: { courseId: approvedCourse.id },
        title: "Course approved",
        type: "COURSE"
      }
    );

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

    await this.invalidateCourseCache();

    await this.notificationService.notifyUsers(
      rejectedCourse.teachers.map((teacher) => teacher.id),
      {
        body: input.feedback.trim(),
        data: { courseId: rejectedCourse.id },
        title: `${rejectedCourse.title} needs changes`,
        type: "COURSE"
      }
    );

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

    this.ensureCanAdministerCourse(course, currentUserId, currentUserRole);

    const uniqueTeacherIds = [...new Set(teacherIds)];

    if (currentUserRole === "TEACHER" && !uniqueTeacherIds.includes(currentUserId)) {
      uniqueTeacherIds.push(currentUserId);
    }

    await this.validateTeachers(uniqueTeacherIds);

    const currentOwnerIds = course.teachers
      .filter((teacher) => teacher.role === "OWNER")
      .map((teacher) => teacher.id);
    const survivingOwnerIds = currentOwnerIds.filter((ownerId) =>
      uniqueTeacherIds.includes(ownerId)
    );

    // A course is never left unaccountable. Dropping every owner is refused
    // outright; a course that had none yet — admin-created — gets its first.
    // ADR-0006.
    if (currentOwnerIds.length > 0 && survivingOwnerIds.length === 0) {
      throw new ValidationError("A course must keep at least one owner", [
        {
          field: "teacherIds",
          message: "Removing every owner would leave this course unaccountable"
        }
      ]);
    }

    const ownerIds =
      survivingOwnerIds.length > 0
        ? survivingOwnerIds
        : uniqueTeacherIds.slice(0, 1);

    await this.courseRepository.replaceTeachers(
      courseId,
      uniqueTeacherIds.map((teacherId) => ({
        role: ownerIds.includes(teacherId) ? ("OWNER" as const) : ("TEACHER" as const),
        teacherId
      }))
    );

    const updatedCourse = await this.courseRepository.findById(courseId);

    if (!updatedCourse) {
      throw new NotFoundError("Course not found");
    }

    // Catalogue cards carry teacher names, so a roster change stales them.
    await this.invalidateCourseCache();

    return mapCourse(updatedCourse);
  }

  public async listTeacherDirectory(
    search?: string | undefined
  ): Promise<readonly TeacherDirectoryRecord[]> {
    return this.courseRepository.listTeacherDirectory(search);
  }
}
