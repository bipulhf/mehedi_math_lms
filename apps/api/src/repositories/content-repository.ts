import {
  asc,
  chapterMaterials,
  chapters,
  db,
  eq,
  inArray,
  lectureMaterials,
  lectures
} from "@mma/db";

export interface ChapterRecord {
  courseId: string;
  createdAt: Date;
  description: string | null;
  id: string;
  sortOrder: number;
  title: string;
  updatedAt: Date;
}

export interface LectureRecord {
  chapterId: string;
  content: string | null;
  createdAt: Date;
  description: string | null;
  id: string;
  isPreview: boolean;
  sortOrder: number;
  title: string;
  type: "VIDEO_UPLOAD" | "VIDEO_LINK" | "TEXT";
  updatedAt: Date;
  videoDuration: number | null;
  videoUrl: string | null;
}

export interface MaterialRecord {
  createdAt: Date;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  id: string;
  parentId: string;
  title: string;
  updatedAt: Date;
}

export interface CreateChapterInput {
  courseId: string;
  description: string | null;
  sortOrder: number;
  title: string;
}

export interface UpdateChapterInput {
  description?: string | null | undefined;
  sortOrder?: number | undefined;
  title?: string | undefined;
}

export interface CreateLectureInput {
  chapterId: string;
  content: string | null;
  description: string | null;
  isPreview: boolean;
  sortOrder: number;
  title: string;
  type: "VIDEO_UPLOAD" | "VIDEO_LINK" | "TEXT";
  videoDuration: number | null;
  videoUrl: string | null;
}

export interface UpdateLectureInput {
  chapterId?: string | undefined;
  content?: string | null | undefined;
  description?: string | null | undefined;
  isPreview?: boolean | undefined;
  sortOrder?: number | undefined;
  title?: string | undefined;
  type?: "VIDEO_UPLOAD" | "VIDEO_LINK" | "TEXT" | undefined;
  videoDuration?: number | null | undefined;
  videoUrl?: string | null | undefined;
}

export interface CreateMaterialInput {
  fileSize: number;
  fileType: string;
  fileUrl: string;
  title: string;
}

export interface UpdateMaterialInput {
  fileSize?: number | undefined;
  fileType?: string | undefined;
  fileUrl?: string | undefined;
  title?: string | undefined;
}

function mapChapterRecord(row: {
  courseId: string;
  createdAt: Date;
  description: string | null;
  id: string;
  sortOrder: number;
  title: string;
  updatedAt: Date;
}): ChapterRecord {
  return row;
}

function mapLectureRecord(row: {
  chapterId: string;
  content: string | null;
  createdAt: Date;
  description: string | null;
  id: string;
  isPreview: boolean;
  sortOrder: number;
  title: string;
  type: "VIDEO_UPLOAD" | "VIDEO_LINK" | "TEXT";
  updatedAt: Date;
  videoDuration: number | null;
  videoUrl: string | null;
}): LectureRecord {
  return row;
}

function mapMaterialRecord(row: {
  createdAt: Date;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  id: string;
  parentId: string;
  title: string;
  updatedAt: Date;
}): MaterialRecord {
  return row;
}

export class ContentRepository {
  public async listCourseChapters(courseId: string): Promise<readonly ChapterRecord[]> {
    const rows = await db
      .select({
        courseId: chapters.courseId,
        createdAt: chapters.createdAt,
        description: chapters.description,
        id: chapters.id,
        sortOrder: chapters.sortOrder,
        title: chapters.title,
        updatedAt: chapters.updatedAt
      })
      .from(chapters)
      .where(eq(chapters.courseId, courseId))
      .orderBy(asc(chapters.sortOrder), asc(chapters.createdAt));

    return rows.map(mapChapterRecord);
  }

  public async listLecturesByChapterIds(chapterIds: readonly string[]): Promise<readonly LectureRecord[]> {
    if (chapterIds.length === 0) {
      return [];
    }

    const rows = await db
      .select({
        chapterId: lectures.chapterId,
        content: lectures.content,
        createdAt: lectures.createdAt,
        description: lectures.description,
        id: lectures.id,
        isPreview: lectures.isPreview,
        sortOrder: lectures.sortOrder,
        title: lectures.title,
        type: lectures.type,
        updatedAt: lectures.updatedAt,
        videoDuration: lectures.videoDuration,
        videoUrl: lectures.videoUrl
      })
      .from(lectures)
      .where(inArray(lectures.chapterId, [...chapterIds]))
      .orderBy(asc(lectures.chapterId), asc(lectures.sortOrder), asc(lectures.createdAt));

    return rows.map(mapLectureRecord);
  }

  public async listChapterMaterialsByChapterIds(chapterIds: readonly string[]): Promise<readonly MaterialRecord[]> {
    if (chapterIds.length === 0) {
      return [];
    }

    const rows = await db
      .select({
        createdAt: chapterMaterials.createdAt,
        fileSize: chapterMaterials.fileSize,
        fileType: chapterMaterials.fileType,
        fileUrl: chapterMaterials.fileUrl,
        id: chapterMaterials.id,
        parentId: chapterMaterials.chapterId,
        title: chapterMaterials.title,
        updatedAt: chapterMaterials.updatedAt
      })
      .from(chapterMaterials)
      .where(inArray(chapterMaterials.chapterId, [...chapterIds]))
      .orderBy(asc(chapterMaterials.createdAt));

    return rows.map(mapMaterialRecord);
  }

  public async listLectureMaterialsByLectureIds(lectureIds: readonly string[]): Promise<readonly MaterialRecord[]> {
    if (lectureIds.length === 0) {
      return [];
    }

    const rows = await db
      .select({
        createdAt: lectureMaterials.createdAt,
        fileSize: lectureMaterials.fileSize,
        fileType: lectureMaterials.fileType,
        fileUrl: lectureMaterials.fileUrl,
        id: lectureMaterials.id,
        parentId: lectureMaterials.lectureId,
        title: lectureMaterials.title,
        updatedAt: lectureMaterials.updatedAt
      })
      .from(lectureMaterials)
      .where(inArray(lectureMaterials.lectureId, [...lectureIds]))
      .orderBy(asc(lectureMaterials.createdAt));

    return rows.map(mapMaterialRecord);
  }

  public async findChapterById(id: string): Promise<ChapterRecord | null> {
    const rows = await db
      .select({
        courseId: chapters.courseId,
        createdAt: chapters.createdAt,
        description: chapters.description,
        id: chapters.id,
        sortOrder: chapters.sortOrder,
        title: chapters.title,
        updatedAt: chapters.updatedAt
      })
      .from(chapters)
      .where(eq(chapters.id, id))
      .limit(1);

    return rows[0] ? mapChapterRecord(rows[0]) : null;
  }

  public async findLectureById(id: string): Promise<(LectureRecord & { courseId: string }) | null> {
    const rows = await db
      .select({
        chapterId: lectures.chapterId,
        content: lectures.content,
        courseId: chapters.courseId,
        createdAt: lectures.createdAt,
        description: lectures.description,
        id: lectures.id,
        isPreview: lectures.isPreview,
        sortOrder: lectures.sortOrder,
        title: lectures.title,
        type: lectures.type,
        updatedAt: lectures.updatedAt,
        videoDuration: lectures.videoDuration,
        videoUrl: lectures.videoUrl
      })
      .from(lectures)
      .innerJoin(chapters, eq(lectures.chapterId, chapters.id))
      .where(eq(lectures.id, id))
      .limit(1);

    return rows[0] ?? null;
  }

  public async findChapterMaterialById(id: string): Promise<(MaterialRecord & { courseId: string }) | null> {
    const rows = await db
      .select({
        courseId: chapters.courseId,
        createdAt: chapterMaterials.createdAt,
        fileSize: chapterMaterials.fileSize,
        fileType: chapterMaterials.fileType,
        fileUrl: chapterMaterials.fileUrl,
        id: chapterMaterials.id,
        parentId: chapterMaterials.chapterId,
        title: chapterMaterials.title,
        updatedAt: chapterMaterials.updatedAt
      })
      .from(chapterMaterials)
      .innerJoin(chapters, eq(chapterMaterials.chapterId, chapters.id))
      .where(eq(chapterMaterials.id, id))
      .limit(1);

    return rows[0] ?? null;
  }

  public async findLectureMaterialById(id: string): Promise<(MaterialRecord & { courseId: string }) | null> {
    const rows = await db
      .select({
        courseId: chapters.courseId,
        createdAt: lectureMaterials.createdAt,
        fileSize: lectureMaterials.fileSize,
        fileType: lectureMaterials.fileType,
        fileUrl: lectureMaterials.fileUrl,
        id: lectureMaterials.id,
        parentId: lectureMaterials.lectureId,
        title: lectureMaterials.title,
        updatedAt: lectureMaterials.updatedAt
      })
      .from(lectureMaterials)
      .innerJoin(lectures, eq(lectureMaterials.lectureId, lectures.id))
      .innerJoin(chapters, eq(lectures.chapterId, chapters.id))
      .where(eq(lectureMaterials.id, id))
      .limit(1);

    return rows[0] ?? null;
  }

  public async createChapter(input: CreateChapterInput): Promise<ChapterRecord> {
    const rows = await db
      .insert(chapters)
      .values({
        courseId: input.courseId,
        description: input.description,
        sortOrder: input.sortOrder,
        title: input.title
      })
      .returning({
        courseId: chapters.courseId,
        createdAt: chapters.createdAt,
        description: chapters.description,
        id: chapters.id,
        sortOrder: chapters.sortOrder,
        title: chapters.title,
        updatedAt: chapters.updatedAt
      });

    const chapter = rows[0];

    if (!chapter) {
      throw new Error("Failed to create chapter");
    }

    return mapChapterRecord(chapter);
  }

  public async updateChapter(id: string, input: UpdateChapterInput): Promise<ChapterRecord | null> {
    const values: UpdateChapterInput & { updatedAt: Date } = {
      updatedAt: new Date()
    };

    if (input.description !== undefined) {
      values.description = input.description;
    }

    if (input.sortOrder !== undefined) {
      values.sortOrder = input.sortOrder;
    }

    if (input.title !== undefined) {
      values.title = input.title;
    }

    const rows = await db
      .update(chapters)
      .set(values)
      .where(eq(chapters.id, id))
      .returning({
        courseId: chapters.courseId,
        createdAt: chapters.createdAt,
        description: chapters.description,
        id: chapters.id,
        sortOrder: chapters.sortOrder,
        title: chapters.title,
        updatedAt: chapters.updatedAt
      });

    return rows[0] ? mapChapterRecord(rows[0]) : null;
  }

  public async deleteChapter(id: string): Promise<void> {
    await db.delete(chapters).where(eq(chapters.id, id));
  }

  public async reorderChapters(items: readonly { id: string; sortOrder: number }[]): Promise<void> {
    await db.transaction(async (transaction) => {
      for (const item of items) {
        await transaction
          .update(chapters)
          .set({
            sortOrder: item.sortOrder,
            updatedAt: new Date()
          })
          .where(eq(chapters.id, item.id));
      }
    });
  }

  public async createLecture(input: CreateLectureInput): Promise<LectureRecord> {
    const rows = await db
      .insert(lectures)
      .values({
        chapterId: input.chapterId,
        content: input.content,
        description: input.description,
        isPreview: input.isPreview,
        sortOrder: input.sortOrder,
        title: input.title,
        type: input.type,
        videoDuration: input.videoDuration,
        videoUrl: input.videoUrl
      })
      .returning({
        chapterId: lectures.chapterId,
        content: lectures.content,
        createdAt: lectures.createdAt,
        description: lectures.description,
        id: lectures.id,
        isPreview: lectures.isPreview,
        sortOrder: lectures.sortOrder,
        title: lectures.title,
        type: lectures.type,
        updatedAt: lectures.updatedAt,
        videoDuration: lectures.videoDuration,
        videoUrl: lectures.videoUrl
      });

    const lecture = rows[0];

    if (!lecture) {
      throw new Error("Failed to create lecture");
    }

    return mapLectureRecord(lecture);
  }

  public async updateLecture(id: string, input: UpdateLectureInput): Promise<LectureRecord | null> {
    const values: UpdateLectureInput & { updatedAt: Date } = {
      updatedAt: new Date()
    };

    if (input.chapterId !== undefined) {
      values.chapterId = input.chapterId;
    }

    if (input.content !== undefined) {
      values.content = input.content;
    }

    if (input.description !== undefined) {
      values.description = input.description;
    }

    if (input.isPreview !== undefined) {
      values.isPreview = input.isPreview;
    }

    if (input.sortOrder !== undefined) {
      values.sortOrder = input.sortOrder;
    }

    if (input.title !== undefined) {
      values.title = input.title;
    }

    if (input.type !== undefined) {
      values.type = input.type;
    }

    if (input.videoDuration !== undefined) {
      values.videoDuration = input.videoDuration;
    }

    if (input.videoUrl !== undefined) {
      values.videoUrl = input.videoUrl;
    }

    const rows = await db
      .update(lectures)
      .set(values)
      .where(eq(lectures.id, id))
      .returning({
        chapterId: lectures.chapterId,
        content: lectures.content,
        createdAt: lectures.createdAt,
        description: lectures.description,
        id: lectures.id,
        isPreview: lectures.isPreview,
        sortOrder: lectures.sortOrder,
        title: lectures.title,
        type: lectures.type,
        updatedAt: lectures.updatedAt,
        videoDuration: lectures.videoDuration,
        videoUrl: lectures.videoUrl
      });

    return rows[0] ? mapLectureRecord(rows[0]) : null;
  }

  public async deleteLecture(id: string): Promise<void> {
    await db.delete(lectures).where(eq(lectures.id, id));
  }

  public async reorderLectures(
    items: readonly { chapterId: string; id: string; sortOrder: number }[]
  ): Promise<void> {
    await db.transaction(async (transaction) => {
      for (const item of items) {
        await transaction
          .update(lectures)
          .set({
            chapterId: item.chapterId,
            sortOrder: item.sortOrder,
            updatedAt: new Date()
          })
          .where(eq(lectures.id, item.id));
      }
    });
  }

  public async createChapterMaterial(chapterId: string, input: CreateMaterialInput): Promise<MaterialRecord> {
    const rows = await db
      .insert(chapterMaterials)
      .values({
        chapterId,
        fileSize: input.fileSize,
        fileType: input.fileType,
        fileUrl: input.fileUrl,
        title: input.title
      })
      .returning({
        createdAt: chapterMaterials.createdAt,
        fileSize: chapterMaterials.fileSize,
        fileType: chapterMaterials.fileType,
        fileUrl: chapterMaterials.fileUrl,
        id: chapterMaterials.id,
        parentId: chapterMaterials.chapterId,
        title: chapterMaterials.title,
        updatedAt: chapterMaterials.updatedAt
      });

    const material = rows[0];

    if (!material) {
      throw new Error("Failed to create chapter material");
    }

    return mapMaterialRecord(material);
  }

  public async updateChapterMaterial(id: string, input: UpdateMaterialInput): Promise<MaterialRecord | null> {
    const values: UpdateMaterialInput & { updatedAt: Date } = {
      updatedAt: new Date()
    };

    if (input.fileSize !== undefined) {
      values.fileSize = input.fileSize;
    }

    if (input.fileType !== undefined) {
      values.fileType = input.fileType;
    }

    if (input.fileUrl !== undefined) {
      values.fileUrl = input.fileUrl;
    }

    if (input.title !== undefined) {
      values.title = input.title;
    }

    const rows = await db
      .update(chapterMaterials)
      .set(values)
      .where(eq(chapterMaterials.id, id))
      .returning({
        createdAt: chapterMaterials.createdAt,
        fileSize: chapterMaterials.fileSize,
        fileType: chapterMaterials.fileType,
        fileUrl: chapterMaterials.fileUrl,
        id: chapterMaterials.id,
        parentId: chapterMaterials.chapterId,
        title: chapterMaterials.title,
        updatedAt: chapterMaterials.updatedAt
      });

    return rows[0] ? mapMaterialRecord(rows[0]) : null;
  }

  public async deleteChapterMaterial(id: string): Promise<void> {
    await db.delete(chapterMaterials).where(eq(chapterMaterials.id, id));
  }

  public async createLectureMaterial(lectureId: string, input: CreateMaterialInput): Promise<MaterialRecord> {
    const rows = await db
      .insert(lectureMaterials)
      .values({
        fileSize: input.fileSize,
        fileType: input.fileType,
        fileUrl: input.fileUrl,
        lectureId,
        title: input.title
      })
      .returning({
        createdAt: lectureMaterials.createdAt,
        fileSize: lectureMaterials.fileSize,
        fileType: lectureMaterials.fileType,
        fileUrl: lectureMaterials.fileUrl,
        id: lectureMaterials.id,
        parentId: lectureMaterials.lectureId,
        title: lectureMaterials.title,
        updatedAt: lectureMaterials.updatedAt
      });

    const material = rows[0];

    if (!material) {
      throw new Error("Failed to create lecture material");
    }

    return mapMaterialRecord(material);
  }

  public async updateLectureMaterial(id: string, input: UpdateMaterialInput): Promise<MaterialRecord | null> {
    const values: UpdateMaterialInput & { updatedAt: Date } = {
      updatedAt: new Date()
    };

    if (input.fileSize !== undefined) {
      values.fileSize = input.fileSize;
    }

    if (input.fileType !== undefined) {
      values.fileType = input.fileType;
    }

    if (input.fileUrl !== undefined) {
      values.fileUrl = input.fileUrl;
    }

    if (input.title !== undefined) {
      values.title = input.title;
    }

    const rows = await db
      .update(lectureMaterials)
      .set(values)
      .where(eq(lectureMaterials.id, id))
      .returning({
        createdAt: lectureMaterials.createdAt,
        fileSize: lectureMaterials.fileSize,
        fileType: lectureMaterials.fileType,
        fileUrl: lectureMaterials.fileUrl,
        id: lectureMaterials.id,
        parentId: lectureMaterials.lectureId,
        title: lectureMaterials.title,
        updatedAt: lectureMaterials.updatedAt
      });

    return rows[0] ? mapMaterialRecord(rows[0]) : null;
  }

  public async deleteLectureMaterial(id: string): Promise<void> {
    await db.delete(lectureMaterials).where(eq(lectureMaterials.id, id));
  }
}
