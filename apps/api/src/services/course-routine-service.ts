import type { UpsertCourseRoutineInput, UserRole } from "@genex/shared";
import { isEmptyRichText } from "@genex/shared";

import { sanitizeHtml } from "@/lib/html";
import type { CourseRecord, CourseRepository } from "@/repositories/course-repository";
import type {
  CourseRoutineRepository,
  CourseRoutineWithAuthor
} from "@/repositories/course-routine-repository";
import type { EnrollmentRepository } from "@/repositories/enrollment-repository";
import { ForbiddenError, NotFoundError, ValidationError } from "@/utils/errors";

export interface CourseRoutineView {
  attachmentName: string | null;
  attachmentUrl: string | null;
  content: string | null;
  courseId: string;
  createdAt: string;
  id: string;
  updatedAt: string;
  updatedBy: {
    id: string;
    name: string;
  };
}

export class CourseRoutineService {
  public constructor(
    private readonly courseRoutineRepository: CourseRoutineRepository,
    private readonly courseRepository: CourseRepository,
    private readonly enrollmentRepository: EnrollmentRepository
  ) {}

  /** Null rather than a 404: a course without a routine is normal, not missing. */
  public async getForCourse(
    courseId: string,
    userId: string,
    userRole: UserRole
  ): Promise<CourseRoutineView | null> {
    await this.requireCourseReadAccess(courseId, userId, userRole);

    const row = await this.courseRoutineRepository.findByCourseId(courseId);

    return row === null ? null : this.mapRoutine(row);
  }

  public async saveForCourse(
    courseId: string,
    input: UpsertCourseRoutineInput,
    userId: string,
    userRole: UserRole
  ): Promise<CourseRoutineView> {
    await this.requireManageableCourse(courseId, userId, userRole);

    const content =
      input.content == null || isEmptyRichText(input.content) ? null : sanitizeHtml(input.content);
    const attachmentUrl =
      input.attachmentUrl == null || input.attachmentUrl.length === 0 ? null : input.attachmentUrl;

    // The schema already refuses the empty request, but sanitising can strip a
    // body down to nothing after it passed — markup with no words survives the
    // `richTextSchema` length check and comes out empty here.
    if (content === null && attachmentUrl === null) {
      throw new ValidationError("Add a routine, attach a file, or both", [
        { field: "content", message: "Add a routine, attach a file, or both" }
      ]);
    }

    await this.courseRoutineRepository.upsert(courseId, userId, {
      // A name with no file behind it would render as a link to nothing.
      attachmentName: attachmentUrl === null ? null : (input.attachmentName?.trim() ?? null) || null,
      attachmentUrl,
      content
    });

    const saved = await this.courseRoutineRepository.findByCourseId(courseId);

    if (!saved) {
      throw new Error("Failed to load the saved routine");
    }

    return this.mapRoutine(saved);
  }

  public async deleteForCourse(
    courseId: string,
    userId: string,
    userRole: UserRole
  ): Promise<void> {
    await this.requireManageableCourse(courseId, userId, userRole);

    const removed = await this.courseRoutineRepository.deleteByCourseId(courseId);

    if (!removed) {
      throw new NotFoundError("This course has no routine");
    }
  }

  private mapRoutine(row: CourseRoutineWithAuthor): CourseRoutineView {
    return {
      attachmentName: row.attachmentName,
      attachmentUrl: row.attachmentUrl,
      content: row.content,
      courseId: row.courseId,
      createdAt: row.createdAt.toISOString(),
      id: row.id,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: {
        id: row.updatedById,
        name: row.updatedByName
      }
    };
  }

  private async requireCourseReadAccess(
    courseId: string,
    userId: string,
    userRole: UserRole
  ): Promise<CourseRecord> {
    const course = await this.courseRepository.findById(courseId);

    if (!course) {
      throw new NotFoundError("Course not found");
    }

    if (userRole === "ADMIN") {
      return course;
    }

    if (userRole === "STUDENT") {
      const hasAccess = await this.enrollmentRepository.hasCourseAccess(userId, courseId);

      if (!hasAccess) {
        throw new ForbiddenError("You do not have access to this course");
      }

      return course;
    }

    if (userRole === "TEACHER") {
      return this.ensureTeacherManagesCourse(course, userId);
    }

    throw new ForbiddenError("You do not have access to this course routine");
  }

  private async requireManageableCourse(
    courseId: string,
    userId: string,
    userRole: UserRole
  ): Promise<CourseRecord> {
    const course = await this.courseRepository.findById(courseId);

    if (!course) {
      throw new NotFoundError("Course not found");
    }

    if (userRole === "ADMIN") {
      return course;
    }

    if (userRole === "TEACHER") {
      const managedCourse = this.ensureTeacherManagesCourse(course, userId);

      // An archived course's routine is read-only for its teachers, the same
      // rule its noticeboard follows.
      if (managedCourse.status === "ARCHIVED") {
        throw new ForbiddenError(
          "This course is archived and read-only. Restore it to make changes."
        );
      }

      return managedCourse;
    }

    throw new ForbiddenError("Only admins and teachers can manage the routine");
  }

  private ensureTeacherManagesCourse(course: CourseRecord, teacherId: string): CourseRecord {
    const isManager =
      course.creator.id === teacherId || course.teachers.some((teacher) => teacher.id === teacherId);

    if (!isManager) {
      throw new ForbiddenError("You do not manage this course");
    }

    return course;
  }
}
