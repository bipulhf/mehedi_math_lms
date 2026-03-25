import type {
  CreateCourseNoticeInput,
  UpdateCourseNoticeInput,
  UserRole
} from "@mma/shared";

import type { CourseRecord } from "@/repositories/course-repository";
import { CourseRepository } from "@/repositories/course-repository";
import { EnrollmentRepository } from "@/repositories/enrollment-repository";
import { NoticeRepository, type NoticeWithAuthor } from "@/repositories/notice-repository";
import { ForbiddenError, NotFoundError } from "@/utils/errors";

export interface CourseNoticeView {
  author: {
    id: string;
    name: string;
  };
  content: string;
  courseId: string;
  createdAt: string;
  id: string;
  isPinned: boolean;
  title: string;
  updatedAt: string;
}

export class NoticeService {
  public constructor(
    private readonly noticeRepository: NoticeRepository,
    private readonly courseRepository: CourseRepository,
    private readonly enrollmentRepository: EnrollmentRepository
  ) {}

  public async listForCourse(
    courseId: string,
    userId: string,
    userRole: UserRole
  ): Promise<readonly CourseNoticeView[]> {
    await this.requireCourseReadAccess(courseId, userId, userRole);

    const rows = await this.noticeRepository.listByCourseId(courseId);

    return rows.map((row) => this.mapNotice(row));
  }

  public async createNotice(
    courseId: string,
    input: CreateCourseNoticeInput,
    userId: string,
    userRole: UserRole
  ): Promise<CourseNoticeView> {
    await this.requireManageableCourse(courseId, userId, userRole);

    if (input.isPinned) {
      const pinnedCount = await this.noticeRepository.countPinnedForCourse(courseId);

      if (pinnedCount >= 10) {
        throw new ForbiddenError("Too many pinned notices for this course (max 10)");
      }
    }

    const row = await this.noticeRepository.create({
      content: input.content,
      courseId,
      isPinned: input.isPinned,
      teacherId: userId,
      title: input.title
    });

    const full = await this.noticeRepository.listByCourseId(courseId);
    const match = full.find((notice) => notice.id === row.id);

    if (!match) {
      throw new Error("Failed to load created notice");
    }

    return this.mapNotice(match);
  }

  public async updateNotice(
    noticeId: string,
    input: UpdateCourseNoticeInput,
    userId: string,
    userRole: UserRole
  ): Promise<CourseNoticeView> {
    const existing = await this.noticeRepository.findById(noticeId);

    if (!existing) {
      throw new NotFoundError("Notice not found");
    }

    await this.requireManageableCourse(existing.courseId, userId, userRole);

    if (input.isPinned === true && !existing.isPinned) {
      const pinnedCount = await this.noticeRepository.countPinnedForCourse(existing.courseId);

      if (pinnedCount >= 10) {
        throw new ForbiddenError("Too many pinned notices for this course (max 10)");
      }
    }

    const patch: Partial<{ content: string; isPinned: boolean; title: string }> = {};

    if (input.title !== undefined) {
      patch.title = input.title;
    }

    if (input.content !== undefined) {
      patch.content = input.content;
    }

    if (input.isPinned !== undefined) {
      patch.isPinned = input.isPinned;
    }

    const updated = await this.noticeRepository.update(noticeId, patch);

    if (!updated) {
      throw new NotFoundError("Notice not found");
    }

    const full = await this.noticeRepository.listByCourseId(existing.courseId);
    const match = full.find((notice) => notice.id === noticeId);

    if (!match) {
      throw new NotFoundError("Notice not found");
    }

    return this.mapNotice(match);
  }

  public async deleteNotice(noticeId: string, userId: string, userRole: UserRole): Promise<void> {
    const existing = await this.noticeRepository.findById(noticeId);

    if (!existing) {
      throw new NotFoundError("Notice not found");
    }

    await this.requireManageableCourse(existing.courseId, userId, userRole);

    const removed = await this.noticeRepository.delete(noticeId);

    if (!removed) {
      throw new NotFoundError("Notice not found");
    }
  }

  private mapNotice(row: NoticeWithAuthor): CourseNoticeView {
    return {
      author: {
        id: row.teacherId,
        name: row.authorName
      },
      content: row.content,
      courseId: row.courseId,
      createdAt: row.createdAt.toISOString(),
      id: row.id,
      isPinned: row.isPinned,
      title: row.title,
      updatedAt: row.updatedAt.toISOString()
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

    throw new ForbiddenError("You do not have access to course notices");
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
      return this.ensureTeacherManagesCourse(course, userId);
    }

    throw new ForbiddenError("Only admins and teachers can manage notices");
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
