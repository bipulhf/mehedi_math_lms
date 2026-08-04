import type { ContentRepository } from "@/repositories/content-repository";
import type {
  EnrollmentRepository} from "@/repositories/enrollment-repository";
import {
  type CourseProgressRecord,
  type EnrollmentRecord
} from "@/repositories/enrollment-repository";
import type { CourseTestResultRecord, TestRepository } from "@/repositories/test-repository";
import { ForbiddenError, NotFoundError } from "@/utils/errors";

export interface CourseProgressLectureItem {
  chapterId: string;
  completedAt: string | null;
  isCompleted: boolean;
  lastViewedAt: string | null;
  lectureId: string;
}

export interface CourseProgressResponse {
  completedLectures: number;
  completionPercentage: number;
  courseId: string;
  enrollmentId: string;
  enrollmentStatus: EnrollmentRecord["status"];
  lectures: readonly CourseProgressLectureItem[];
  nextLectureId: string | null;
  totalLectures: number;
}

export class ProgressService {
  public constructor(
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly contentRepository: ContentRepository,
    private readonly testRepository: TestRepository
  ) {}

  private async requireAccessibleEnrollment(
    courseId: string,
    currentUserId: string
  ): Promise<EnrollmentRecord> {
    const hasAccess = await this.enrollmentRepository.hasCourseAccess(currentUserId, courseId);

    if (!hasAccess) {
      throw new ForbiddenError("You do not have access to this course");
    }

    const enrollment = await this.enrollmentRepository.findByUserAndCourse(currentUserId, courseId);

    if (!enrollment) {
      throw new NotFoundError("Enrollment not found");
    }

    return enrollment;
  }

  private mapProgressRecord(
    record: CourseProgressRecord | undefined,
    lectureId: string,
    chapterId: string
  ): CourseProgressLectureItem {
    return {
      chapterId,
      completedAt: record?.completedAt?.toISOString() ?? null,
      isCompleted: record?.isCompleted ?? false,
      lastViewedAt: record?.lastViewedAt?.toISOString() ?? null,
      lectureId
    };
  }

  /**
   * A Test is passed when the best graded attempt reaches its passing score.
   * A null or zero passing score is a threshold nobody opted into, so any
   * graded attempt passes it — existing tests must not become impossible.
   * ADR-0005.
   */
  private isTestPassed(result: CourseTestResultRecord): boolean {
    if (result.bestGradedScore === null) {
      return false;
    }

    return result.bestGradedScore >= (result.passingScore ?? 0);
  }

  /**
   * Finished the course: every Lecture watched and every published Test passed.
   * One rule for both course kinds — an Exam-Only Course simply has no
   * lectures, so only its Tests decide. ADR-0005.
   */
  private async hasFinishedCourse(
    courseId: string,
    userId: string,
    completedLectures: number,
    totalLectures: number
  ): Promise<boolean> {
    if (completedLectures < totalLectures) {
      return false;
    }

    const testResults = await this.testRepository.listCourseTestResults(courseId, userId);

    if (totalLectures === 0 && testResults.length === 0) {
      return false;
    }

    return testResults.every((result) => this.isTestPassed(result));
  }

  private async buildCourseProgress(
    courseId: string,
    enrollment: EnrollmentRecord
  ): Promise<CourseProgressResponse> {
    const chapters = (await this.contentRepository.listCourseChapters(courseId)).filter(
      (chapter) => chapter.isPublished !== false
    );
    const lectures = (await this.contentRepository.listLecturesByChapterIds(
      chapters.map((chapter) => chapter.id)
    )).filter((lecture) => lecture.isPublished !== false);
    const progressRecords = await this.enrollmentRepository.listProgressByEnrollment(enrollment.id);
    const progressByLectureId = new Map(
      progressRecords.map((record) => [record.lectureId, record] as const)
    );
    const lectureItems = lectures.map((lecture) =>
      this.mapProgressRecord(progressByLectureId.get(lecture.id), lecture.id, lecture.chapterId)
    );
    const completedLectures = lectureItems.filter((lecture) => lecture.isCompleted).length;
    const totalLectures = lectures.length;

    // Deliberately does not promote. Completion is caused by the student, never
    // by reading their progress — otherwise deleting the last unwatched lecture
    // silently graduates everyone waiting on it. ADR-0005.
    return {
      completedLectures,
      completionPercentage:
        totalLectures === 0 ? 0 : Math.round((completedLectures / totalLectures) * 100),
      courseId,
      enrollmentId: enrollment.id,
      enrollmentStatus: enrollment.status,
      lectures: lectureItems,
      nextLectureId: lectureItems.find((lecture) => !lecture.isCompleted)?.lectureId ?? null,
      totalLectures
    };
  }

  public async getCourseProgress(
    courseId: string,
    currentUserId: string
  ): Promise<CourseProgressResponse> {
    const enrollment = await this.requireAccessibleEnrollment(courseId, currentUserId);

    return this.buildCourseProgress(courseId, enrollment);
  }

  public async markLectureComplete(
    lectureId: string,
    currentUserId: string
  ): Promise<CourseProgressResponse> {
    const lecture = await this.contentRepository.findLectureById(lectureId);

    if (!lecture) {
      throw new NotFoundError("Lecture not found");
    }

    if (lecture.isPublished === false) {
      throw new NotFoundError("Lecture not found");
    }

    const enrollment = await this.requireAccessibleEnrollment(lecture.courseId, currentUserId);
    const existingProgress = await this.enrollmentRepository.findProgressByEnrollmentAndLecture(
      enrollment.id,
      lectureId
    );
    const now = new Date();

    if (existingProgress) {
      await this.enrollmentRepository.updateProgress(existingProgress.id, {
        completedAt: existingProgress.completedAt ?? now,
        isCompleted: true,
        lastViewedAt: now
      });
    } else {
      await this.enrollmentRepository.createProgress({
        completedAt: now,
        enrollmentId: enrollment.id,
        isCompleted: true,
        lastViewedAt: now,
        lectureId
      });
    }

    const promoted = await this.promoteIfFinished(lecture.courseId, enrollment);

    return this.buildCourseProgress(lecture.courseId, promoted);
  }

  /**
   * The one place progress can promote an enrolment, called from the student's
   * own actions. Completion latches, so an already-complete enrolment is left
   * alone. ADR-0005.
   */
  public async promoteIfFinished(
    courseId: string,
    enrollment: EnrollmentRecord
  ): Promise<EnrollmentRecord> {
    if (enrollment.status === "COMPLETED") {
      return enrollment;
    }

    const chapters = (await this.contentRepository.listCourseChapters(courseId)).filter(
      (chapter) => chapter.isPublished !== false
    );
    const lectures = (await this.contentRepository.listLecturesByChapterIds(
      chapters.map((chapter) => chapter.id)
    )).filter((lecture) => lecture.isPublished !== false);
    const progressRecords = await this.enrollmentRepository.listProgressByEnrollment(enrollment.id);
    const completedLectureIds = new Set(
      progressRecords.filter((record) => record.isCompleted).map((record) => record.lectureId)
    );
    const completedLectures = lectures.filter((lecture) =>
      completedLectureIds.has(lecture.id)
    ).length;

    const finished = await this.hasFinishedCourse(
      courseId,
      enrollment.userId,
      completedLectures,
      lectures.length
    );

    if (!finished) {
      return enrollment;
    }

    return this.enrollmentRepository.updateStatus(enrollment.id, "COMPLETED");
  }
}
