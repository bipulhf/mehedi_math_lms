import { apiGet } from "@/src/lib/api-client";

/** Course content: the enrolled reader's chapters, the public outline, and one free lesson. */

export interface ContentMaterial {
  createdAt: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  id: string;
  title: string;
  updatedAt: string;
}

export interface ContentLecture {
  chapterId: string;
  content: string | null;
  createdAt: string;
  description: string | null;
  id: string;
  isPreview: boolean;
  materials: readonly ContentMaterial[];
  sortOrder: number;
  title: string;
  type: "VIDEO_UPLOAD" | "VIDEO_LINK" | "TEXT";
  updatedAt: string;
  videoDuration: number | null;
  videoUrl: string | null;
}

export interface ContentChapter {
  courseId: string;
  createdAt: string;
  description: string | null;
  id: string;
  lectures: readonly ContentLecture[];
  materials: readonly ContentMaterial[];
  sortOrder: number;
  title: string;
  updatedAt: string;
}

/** The public outline — titles and lengths, no video and no materials. */
export interface CourseOutlineLesson {
  durationSeconds: number | null;
  id: string;
  isPreview: boolean;
  title: string;
}

export interface CourseOutlineChapter {
  id: string;
  lessons: readonly CourseOutlineLesson[];
  title: string;
}

/** A free lesson's playable body — served to anyone, no session needed. */
export interface CourseLecturePreview {
  content: string | null;
  description: string | null;
  durationSeconds: number | null;
  id: string;
  materials: readonly ContentMaterial[];
  title: string;
  type: "VIDEO_UPLOAD" | "VIDEO_LINK" | "TEXT";
  videoUrl: string | null;
}

export async function getCourseContent(courseId: string): Promise<readonly ContentChapter[]> {
  return apiGet<readonly ContentChapter[]>(`courses/${courseId}/content`);
}

/** The public outline — titles and lengths, no video and no materials. */
export async function getCourseOutline(courseId: string): Promise<readonly CourseOutlineChapter[]> {
  return apiGet<readonly CourseOutlineChapter[]>(`courses/${courseId}/outline`);
}

/** A single free lesson, playable without an account. */
export async function getLecturePreview(lectureId: string): Promise<CourseLecturePreview> {
  return apiGet<CourseLecturePreview>(`lectures/${lectureId}/preview`);
}
