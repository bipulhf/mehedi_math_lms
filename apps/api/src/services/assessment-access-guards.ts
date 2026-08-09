import type { UserRole } from "@mma/shared";

import type { ChapterRecord, ContentRepository } from "@/repositories/content-repository";
import type { CourseRecord, CourseRepository } from "@/repositories/course-repository";
import type { EnrollmentRepository } from "@/repositories/enrollment-repository";
import type {
  QuestionRecord,
  TestRecord,
  TestRepository
} from "@/repositories/test-repository";
import { ForbiddenError, NotFoundError } from "@/utils/errors";

/**
 * Who may read or change an assessment, and nothing else.
 *
 * Every one of these was a private method on `TestService`, called from most of
 * its twenty public methods. Pulled out so the authorization rules can be read
 * on their own, in the order they escalate: course, chapter, test, question.
 */
export class AssessmentAccessGuards {
  public constructor(
    private readonly testRepository: TestRepository,
    private readonly contentRepository: ContentRepository,
    private readonly courseRepository: CourseRepository,
    private readonly enrollmentRepository: EnrollmentRepository
  ) {}

  public async requireStudentCourseAccess(
    courseId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<void> {
    if (currentUserRole !== "STUDENT") {
      throw new ForbiddenError("You do not have permission to access course assessments");
    }

    const hasAccess = await this.enrollmentRepository.hasCourseAccess(currentUserId, courseId);

    if (!hasAccess) {
      throw new ForbiddenError("You do not have access to this course assessments");
    }
  }

  public async requireManageableCourse(
    courseId: string,
    currentUserId: string,
    currentUserRole: UserRole,
    options: { allowArchived?: boolean } = {}
  ): Promise<CourseRecord> {
    const course = await this.courseRepository.findById(courseId);

    if (!course) {
      throw new NotFoundError("Course not found");
    }

    if (currentUserRole === "ADMIN") {
      return course;
    }

    const canManage =
      course.creator.id === currentUserId ||
      course.teachers.some((teacher) => teacher.id === currentUserId);

    if (!canManage) {
      throw new ForbiddenError("You do not have permission to manage course assessments");
    }

    // An archived course is read-only for its teachers. Restore it (course
    // owner or admin only) before editing tests or questions.
    if (!options.allowArchived && course.status === "ARCHIVED") {
      throw new ForbiddenError("This course is archived and read-only. Restore it to make changes.");
    }

    return course;
  }

  public async requireManageableChapter(
    chapterId: string,
    currentUserId: string,
    currentUserRole: UserRole,
    options: { allowArchived?: boolean } = {}
  ): Promise<ChapterRecord> {
    const chapter = await this.contentRepository.findChapterById(chapterId);

    if (!chapter) {
      throw new NotFoundError("Chapter not found");
    }

    await this.requireManageableCourse(chapter.courseId, currentUserId, currentUserRole, options);

    return chapter;
  }

  public async requireManageableTest(
    testId: string,
    currentUserId: string,
    currentUserRole: UserRole,
    options: { allowArchived?: boolean } = {}
  ): Promise<TestRecord & { chapter: ChapterRecord }> {
    const test = await this.testRepository.findTestById(testId);

    if (!test) {
      throw new NotFoundError("Test not found");
    }

    const chapter = await this.requireManageableChapter(
      test.chapterId,
      currentUserId,
      currentUserRole,
      options
    );

    return {
      ...test,
      chapter
    };
  }

  public async requireAccessibleTest(
    testId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<TestRecord & { chapter: ChapterRecord }> {
    const test = await this.testRepository.findTestById(testId);

    if (!test) {
      throw new NotFoundError("Test not found");
    }

    const chapter = await this.contentRepository.findChapterById(test.chapterId);

    if (!chapter) {
      throw new NotFoundError("Chapter not found");
    }

    if (currentUserRole === "ADMIN" || currentUserRole === "TEACHER") {
      // Read-only path: a teacher may still open a test on an archived course.
      await this.requireManageableChapter(chapter.id, currentUserId, currentUserRole, {
        allowArchived: true
      });
      return {
        ...test,
        chapter
      };
    }

    await this.requireStudentCourseAccess(chapter.courseId, currentUserId, currentUserRole);

    if (chapter.isPublished === false || !test.isPublished) {
      throw new ForbiddenError("This test is not available yet");
    }

    return {
      ...test,
      chapter
    };
  }

  public async requireManageableQuestion(
    questionId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<QuestionRecord & { test: TestRecord }> {
    const question = await this.testRepository.findQuestionById(questionId);

    if (!question) {
      throw new NotFoundError("Question not found");
    }

    const test = await this.requireManageableTest(question.testId, currentUserId, currentUserRole);

    return {
      ...question,
      test
    };
  }
}
