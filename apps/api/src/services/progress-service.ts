import { ContentRepository } from "@/repositories/content-repository";
import {
  EnrollmentRepository,
  type CourseProgressRecord,
  type EnrollmentRecord
} from "@/repositories/enrollment-repository";
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
    private readonly contentRepository: ContentRepository
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

  private async buildCourseProgress(
    courseId: string,
    enrollment: EnrollmentRecord
  ): Promise<CourseProgressResponse> {
    const chapters = await this.contentRepository.listCourseChapters(courseId);
    const lectures = await this.contentRepository.listLecturesByChapterIds(
      chapters.map((chapter) => chapter.id)
    );
    const progressRecords = await this.enrollmentRepository.listProgressByEnrollment(enrollment.id);
    const progressByLectureId = new Map(
      progressRecords.map((record) => [record.lectureId, record] as const)
    );
    const lectureItems = lectures.map((lecture) =>
      this.mapProgressRecord(progressByLectureId.get(lecture.id), lecture.id, lecture.chapterId)
    );
    const completedLectures = lectureItems.filter((lecture) => lecture.isCompleted).length;
    const totalLectures = lectures.length;

    if (
      totalLectures > 0 &&
      completedLectures === totalLectures &&
      enrollment.status !== "COMPLETED"
    ) {
      enrollment = await this.enrollmentRepository.updateStatus(enrollment.id, "COMPLETED");
    }

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

    return this.buildCourseProgress(lecture.courseId, enrollment);
  }
}
