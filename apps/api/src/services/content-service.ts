import type { UserRole } from "@mma/shared";
import type { z } from "zod";
import {
  createChapterSchema,
  createLectureSchema,
  createMaterialSchema,
  reorderChaptersSchema,
  reorderLecturesSchema,
  updateChapterSchema,
  updateLectureSchema,
  updateMaterialSchema
} from "@mma/shared";

import { CourseRepository, type CourseRecord } from "@/repositories/course-repository";
import {
  ContentRepository,
  type ChapterRecord,
  type LectureRecord,
  type MaterialRecord
} from "@/repositories/content-repository";
import { ForbiddenError, NotFoundError, ValidationError } from "@/utils/errors";

type CreateChapterInput = z.infer<typeof createChapterSchema>;
type UpdateChapterInput = z.infer<typeof updateChapterSchema>;
type ReorderChaptersInput = z.infer<typeof reorderChaptersSchema>;
type CreateLectureInput = z.infer<typeof createLectureSchema>;
type UpdateLectureInput = z.infer<typeof updateLectureSchema>;
type ReorderLecturesInput = z.infer<typeof reorderLecturesSchema>;
type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;

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

function normalizeOptionalString(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function mapMaterial(record: MaterialRecord): ContentMaterial {
  return {
    createdAt: record.createdAt.toISOString(),
    fileSize: record.fileSize,
    fileType: record.fileType,
    fileUrl: record.fileUrl,
    id: record.id,
    title: record.title,
    updatedAt: record.updatedAt.toISOString()
  };
}

function mapLecture(record: LectureRecord, materials: readonly ContentMaterial[]): ContentLecture {
  return {
    chapterId: record.chapterId,
    content: record.content,
    createdAt: record.createdAt.toISOString(),
    description: record.description,
    id: record.id,
    isPreview: record.isPreview,
    materials,
    sortOrder: record.sortOrder,
    title: record.title,
    type: record.type,
    updatedAt: record.updatedAt.toISOString(),
    videoDuration: record.videoDuration,
    videoUrl: record.videoUrl
  };
}

function mapChapter(
  record: ChapterRecord,
  lectures: readonly ContentLecture[],
  materials: readonly ContentMaterial[]
): ContentChapter {
  return {
    courseId: record.courseId,
    createdAt: record.createdAt.toISOString(),
    description: record.description,
    id: record.id,
    lectures,
    materials,
    sortOrder: record.sortOrder,
    title: record.title,
    updatedAt: record.updatedAt.toISOString()
  };
}

export class ContentService {
  public constructor(
    private readonly contentRepository: ContentRepository,
    private readonly courseRepository: CourseRepository
  ) {}

  private async requireManageableCourse(
    courseId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<CourseRecord> {
    const course = await this.courseRepository.findById(courseId);

    if (!course) {
      throw new NotFoundError("Course not found");
    }

    if (currentUserRole === "ADMIN") {
      return course;
    }

    const isAssignedTeacher = course.teachers.some((teacher) => teacher.id === currentUserId);
    const isCreator = course.creator.id === currentUserId;

    if (!isAssignedTeacher && !isCreator) {
      throw new ForbiddenError("You do not have permission to manage this course content");
    }

    return course;
  }

  private async requireManageableChapter(
    chapterId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<ChapterRecord> {
    const chapter = await this.contentRepository.findChapterById(chapterId);

    if (!chapter) {
      throw new NotFoundError("Chapter not found");
    }

    await this.requireManageableCourse(chapter.courseId, currentUserId, currentUserRole);

    return chapter;
  }

  private async requireManageableLecture(
    lectureId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<LectureRecord & { courseId: string }> {
    const lecture = await this.contentRepository.findLectureById(lectureId);

    if (!lecture) {
      throw new NotFoundError("Lecture not found");
    }

    await this.requireManageableCourse(lecture.courseId, currentUserId, currentUserRole);

    return lecture;
  }

  private validateMaterialType(fileType: string): void {
    const normalizedType = fileType.toLowerCase();
    const isAllowed =
      normalizedType.startsWith("image/") ||
      normalizedType === "application/pdf" ||
      normalizedType === "application/msword" ||
      normalizedType === "application/vnd.ms-powerpoint" ||
      normalizedType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      normalizedType === "application/vnd.openxmlformats-officedocument.presentationml.presentation";

    if (!isAllowed) {
      throw new ValidationError("Unsupported material file type", [
        {
          field: "fileType",
          message: "Use PDF, DOC, DOCX, PPT, PPTX, or image files"
        }
      ]);
    }
  }

  private validateLectureInput(
    input: {
      content: string | null;
      type: "VIDEO_UPLOAD" | "VIDEO_LINK" | "TEXT";
      videoUrl: string | null;
    },
    fieldPrefix = ""
  ): void {
    const prefix = fieldPrefix ? `${fieldPrefix}.` : "";

    if ((input.type === "VIDEO_LINK" || input.type === "VIDEO_UPLOAD") && !input.videoUrl) {
      throw new ValidationError("Video URL is required", [
        {
          field: `${prefix}videoUrl`,
          message: "Provide a video URL for video lectures"
        }
      ]);
    }

    if (input.type === "TEXT" && !input.content) {
      throw new ValidationError("Content is required", [
        {
          field: `${prefix}content`,
          message: "Provide text content for text lectures"
        }
      ]);
    }
  }

  public async getCourseContent(
    courseId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<readonly ContentChapter[]> {
    await this.requireManageableCourse(courseId, currentUserId, currentUserRole);

    const chapterRecords = await this.contentRepository.listCourseChapters(courseId);
    const chapterIds = chapterRecords.map((chapter) => chapter.id);
    const [lectureRecords, chapterMaterials] = await Promise.all([
      this.contentRepository.listLecturesByChapterIds(chapterIds),
      this.contentRepository.listChapterMaterialsByChapterIds(chapterIds)
    ]);
    const lectureIds = lectureRecords.map((lecture) => lecture.id);
    const finalLectureMaterials =
      lectureIds.length > 0
        ? await this.contentRepository.listLectureMaterialsByLectureIds(lectureIds)
        : [];

    const chapterMaterialMap = new Map<string, readonly ContentMaterial[]>();
    for (const material of chapterMaterials) {
      const currentMaterials = chapterMaterialMap.get(material.parentId) ?? [];
      chapterMaterialMap.set(material.parentId, [...currentMaterials, mapMaterial(material)]);
    }

    const lectureMaterialMap = new Map<string, readonly ContentMaterial[]>();
    for (const material of finalLectureMaterials) {
      const currentMaterials = lectureMaterialMap.get(material.parentId) ?? [];
      lectureMaterialMap.set(material.parentId, [...currentMaterials, mapMaterial(material)]);
    }

    const lecturesByChapterId = new Map<string, readonly ContentLecture[]>();
    for (const lecture of lectureRecords) {
      const currentLectures = lecturesByChapterId.get(lecture.chapterId) ?? [];
      lecturesByChapterId.set(lecture.chapterId, [
        ...currentLectures,
        mapLecture(lecture, lectureMaterialMap.get(lecture.id) ?? [])
      ]);
    }

    return chapterRecords.map((chapter) =>
      mapChapter(
        chapter,
        lecturesByChapterId.get(chapter.id) ?? [],
        chapterMaterialMap.get(chapter.id) ?? []
      )
    );
  }

  public async createChapter(
    courseId: string,
    input: CreateChapterInput,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<ContentChapter> {
    await this.requireManageableCourse(courseId, currentUserId, currentUserRole);
    const currentChapters = await this.contentRepository.listCourseChapters(courseId);
    const chapter = await this.contentRepository.createChapter({
      courseId,
      description: normalizeOptionalString(input.description),
      sortOrder: currentChapters.length,
      title: input.title.trim()
    });

    return mapChapter(chapter, [], []);
  }

  public async updateChapter(
    chapterId: string,
    input: UpdateChapterInput,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<ContentChapter> {
    await this.requireManageableChapter(chapterId, currentUserId, currentUserRole);
    const chapter = await this.contentRepository.updateChapter(chapterId, {
      description:
        input.description === undefined ? undefined : normalizeOptionalString(input.description),
      title: input.title?.trim()
    });

    if (!chapter) {
      throw new NotFoundError("Chapter not found");
    }

    return mapChapter(chapter, [], []);
  }

  public async deleteChapter(
    chapterId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<{ id: string }> {
    await this.requireManageableChapter(chapterId, currentUserId, currentUserRole);
    await this.contentRepository.deleteChapter(chapterId);

    return { id: chapterId };
  }

  public async reorderChapters(
    courseId: string,
    input: ReorderChaptersInput,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<readonly ContentChapter[]> {
    await this.requireManageableCourse(courseId, currentUserId, currentUserRole);
    const chapters = await this.contentRepository.listCourseChapters(courseId);
    const chapterIds = new Set(chapters.map((chapter) => chapter.id));

    if (input.items.length !== chapters.length) {
      throw new ValidationError("Reorder payload is incomplete", [
        {
          field: "items",
          message: "Include every chapter in the course reorder payload"
        }
      ]);
    }

    for (const item of input.items) {
      if (!chapterIds.has(item.id)) {
        throw new ValidationError("Chapter does not belong to this course", [
          {
            field: "items.id",
            message: "Only chapters from this course can be reordered"
          }
        ]);
      }
    }

    await this.contentRepository.reorderChapters(input.items);

    return this.getCourseContent(courseId, currentUserId, currentUserRole);
  }

  public async createLecture(
    chapterId: string,
    input: CreateLectureInput,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<ContentLecture> {
    const chapter = await this.requireManageableChapter(chapterId, currentUserId, currentUserRole);
    const lectures = await this.contentRepository.listLecturesByChapterIds([chapterId]);
    const normalizedLectureInput = {
      content: normalizeOptionalString(input.content),
      type: input.type,
      videoUrl: normalizeOptionalString(input.videoUrl)
    };

    this.validateLectureInput(normalizedLectureInput);

    const lecture = await this.contentRepository.createLecture({
      chapterId: chapter.id,
      content: normalizedLectureInput.content,
      description: normalizeOptionalString(input.description),
      isPreview: input.isPreview,
      sortOrder: lectures.length,
      title: input.title.trim(),
      type: input.type,
      videoDuration: input.videoDuration ?? null,
      videoUrl: normalizedLectureInput.videoUrl
    });

    return mapLecture(lecture, []);
  }

  public async updateLecture(
    lectureId: string,
    input: UpdateLectureInput,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<ContentLecture> {
    const lecture = await this.requireManageableLecture(lectureId, currentUserId, currentUserRole);
    const nextType = input.type ?? lecture.type;
    const nextContent =
      input.content === undefined ? lecture.content : normalizeOptionalString(input.content);
    const nextVideoUrl =
      input.videoUrl === undefined ? lecture.videoUrl : normalizeOptionalString(input.videoUrl);

    this.validateLectureInput({
      content: nextContent,
      type: nextType,
      videoUrl: nextVideoUrl
    });

    const updatedLecture = await this.contentRepository.updateLecture(lectureId, {
      content: input.content === undefined ? undefined : nextContent,
      description:
        input.description === undefined ? undefined : normalizeOptionalString(input.description),
      isPreview: input.isPreview,
      title: input.title?.trim(),
      type: input.type,
      videoDuration: input.videoDuration ?? undefined,
      videoUrl: input.videoUrl === undefined ? undefined : nextVideoUrl
    });

    if (!updatedLecture) {
      throw new NotFoundError("Lecture not found");
    }

    return mapLecture(updatedLecture, []);
  }

  public async deleteLecture(
    lectureId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<{ id: string }> {
    await this.requireManageableLecture(lectureId, currentUserId, currentUserRole);
    await this.contentRepository.deleteLecture(lectureId);

    return { id: lectureId };
  }

  public async reorderLectures(
    chapterId: string,
    input: ReorderLecturesInput,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<readonly ContentChapter[]> {
    const chapter = await this.requireManageableChapter(chapterId, currentUserId, currentUserRole);
    const chapters = await this.contentRepository.listCourseChapters(chapter.courseId);
    const chapterIds = new Set(chapters.map((item) => item.id));
    const existingLectures = await this.contentRepository.listLecturesByChapterIds(
      chapters.map((item) => item.id)
    );
    const lectureIds = new Set(existingLectures.map((lecture) => lecture.id));

    for (const item of input.items) {
      if (!lectureIds.has(item.id)) {
        throw new ValidationError("Lecture does not belong to this course", [
          {
            field: "items.id",
            message: "Only lectures from this course can be reordered"
          }
        ]);
      }

      if (!chapterIds.has(item.chapterId)) {
        throw new ValidationError("Target chapter does not belong to this course", [
          {
            field: "items.chapterId",
            message: "Lectures can only be moved inside this course"
          }
        ]);
      }
    }

    await this.contentRepository.reorderLectures(input.items);

    return this.getCourseContent(chapter.courseId, currentUserId, currentUserRole);
  }

  public async createChapterMaterial(
    chapterId: string,
    input: CreateMaterialInput,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<ContentMaterial> {
    await this.requireManageableChapter(chapterId, currentUserId, currentUserRole);
    this.validateMaterialType(input.fileType);
    const material = await this.contentRepository.createChapterMaterial(chapterId, {
      fileSize: input.fileSize,
      fileType: input.fileType.trim(),
      fileUrl: input.fileUrl,
      title: input.title.trim()
    });

    return mapMaterial(material);
  }

  public async updateChapterMaterial(
    materialId: string,
    input: UpdateMaterialInput,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<ContentMaterial> {
    const material = await this.contentRepository.findChapterMaterialById(materialId);

    if (!material) {
      throw new NotFoundError("Chapter material not found");
    }

    await this.requireManageableCourse(material.courseId, currentUserId, currentUserRole);

    if (input.fileType) {
      this.validateMaterialType(input.fileType);
    }

    const updatedMaterial = await this.contentRepository.updateChapterMaterial(materialId, {
      fileSize: input.fileSize,
      fileType: input.fileType?.trim(),
      fileUrl: input.fileUrl,
      title: input.title?.trim()
    });

    if (!updatedMaterial) {
      throw new NotFoundError("Chapter material not found");
    }

    return mapMaterial(updatedMaterial);
  }

  public async deleteChapterMaterial(
    materialId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<{ id: string }> {
    const material = await this.contentRepository.findChapterMaterialById(materialId);

    if (!material) {
      throw new NotFoundError("Chapter material not found");
    }

    await this.requireManageableCourse(material.courseId, currentUserId, currentUserRole);
    await this.contentRepository.deleteChapterMaterial(materialId);

    return { id: materialId };
  }

  public async createLectureMaterial(
    lectureId: string,
    input: CreateMaterialInput,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<ContentMaterial> {
    await this.requireManageableLecture(lectureId, currentUserId, currentUserRole);
    this.validateMaterialType(input.fileType);
    const material = await this.contentRepository.createLectureMaterial(lectureId, {
      fileSize: input.fileSize,
      fileType: input.fileType.trim(),
      fileUrl: input.fileUrl,
      title: input.title.trim()
    });

    return mapMaterial(material);
  }

  public async updateLectureMaterial(
    materialId: string,
    input: UpdateMaterialInput,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<ContentMaterial> {
    const material = await this.contentRepository.findLectureMaterialById(materialId);

    if (!material) {
      throw new NotFoundError("Lecture material not found");
    }

    await this.requireManageableCourse(material.courseId, currentUserId, currentUserRole);

    if (input.fileType) {
      this.validateMaterialType(input.fileType);
    }

    const updatedMaterial = await this.contentRepository.updateLectureMaterial(materialId, {
      fileSize: input.fileSize,
      fileType: input.fileType?.trim(),
      fileUrl: input.fileUrl,
      title: input.title?.trim()
    });

    if (!updatedMaterial) {
      throw new NotFoundError("Lecture material not found");
    }

    return mapMaterial(updatedMaterial);
  }

  public async deleteLectureMaterial(
    materialId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<{ id: string }> {
    const material = await this.contentRepository.findLectureMaterialById(materialId);

    if (!material) {
      throw new NotFoundError("Lecture material not found");
    }

    await this.requireManageableCourse(material.courseId, currentUserId, currentUserRole);
    await this.contentRepository.deleteLectureMaterial(materialId);

    return { id: materialId };
  }
}
