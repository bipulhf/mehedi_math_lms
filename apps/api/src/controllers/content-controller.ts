import type { Context } from "hono";
import type { UserRole } from "@mma/shared";

import { ContentService } from "@/services/content-service";
import type { AppBindings } from "@/types/app-bindings";
import { success } from "@/utils/response";

export class ContentController {
  public constructor(private readonly contentService: ContentService) {}

  public async getCourseContent(
    context: Context<AppBindings>,
    courseId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const content = await this.contentService.getCourseContent(
      courseId,
      currentUserId,
      currentUserRole
    );

    return success(context, content);
  }

  public async createChapter(
    context: Context<AppBindings>,
    courseId: string,
    input: Parameters<ContentService["createChapter"]>[1],
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const chapter = await this.contentService.createChapter(
      courseId,
      input,
      currentUserId,
      currentUserRole
    );

    return success(context, chapter, 201, "Chapter created successfully");
  }

  public async updateChapter(
    context: Context<AppBindings>,
    chapterId: string,
    input: Parameters<ContentService["updateChapter"]>[1],
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const chapter = await this.contentService.updateChapter(
      chapterId,
      input,
      currentUserId,
      currentUserRole
    );

    return success(context, chapter, 200, "Chapter updated successfully");
  }

  public async deleteChapter(
    context: Context<AppBindings>,
    chapterId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const result = await this.contentService.deleteChapter(
      chapterId,
      currentUserId,
      currentUserRole
    );

    return success(context, result, 200, "Chapter deleted successfully");
  }

  public async reorderChapters(
    context: Context<AppBindings>,
    courseId: string,
    input: Parameters<ContentService["reorderChapters"]>[1],
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const content = await this.contentService.reorderChapters(
      courseId,
      input,
      currentUserId,
      currentUserRole
    );

    return success(context, content, 200, "Chapter order updated successfully");
  }

  public async createLecture(
    context: Context<AppBindings>,
    chapterId: string,
    input: Parameters<ContentService["createLecture"]>[1],
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const lecture = await this.contentService.createLecture(
      chapterId,
      input,
      currentUserId,
      currentUserRole
    );

    return success(context, lecture, 201, "Lecture created successfully");
  }

  public async updateLecture(
    context: Context<AppBindings>,
    lectureId: string,
    input: Parameters<ContentService["updateLecture"]>[1],
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const lecture = await this.contentService.updateLecture(
      lectureId,
      input,
      currentUserId,
      currentUserRole
    );

    return success(context, lecture, 200, "Lecture updated successfully");
  }

  public async deleteLecture(
    context: Context<AppBindings>,
    lectureId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const result = await this.contentService.deleteLecture(
      lectureId,
      currentUserId,
      currentUserRole
    );

    return success(context, result, 200, "Lecture deleted successfully");
  }

  public async reorderLectures(
    context: Context<AppBindings>,
    chapterId: string,
    input: Parameters<ContentService["reorderLectures"]>[1],
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const content = await this.contentService.reorderLectures(
      chapterId,
      input,
      currentUserId,
      currentUserRole
    );

    return success(context, content, 200, "Lecture order updated successfully");
  }

  public async createChapterMaterial(
    context: Context<AppBindings>,
    chapterId: string,
    input: Parameters<ContentService["createChapterMaterial"]>[1],
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const material = await this.contentService.createChapterMaterial(
      chapterId,
      input,
      currentUserId,
      currentUserRole
    );

    return success(context, material, 201, "Chapter material created successfully");
  }

  public async updateChapterMaterial(
    context: Context<AppBindings>,
    materialId: string,
    input: Parameters<ContentService["updateChapterMaterial"]>[1],
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const material = await this.contentService.updateChapterMaterial(
      materialId,
      input,
      currentUserId,
      currentUserRole
    );

    return success(context, material, 200, "Chapter material updated successfully");
  }

  public async deleteChapterMaterial(
    context: Context<AppBindings>,
    materialId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const result = await this.contentService.deleteChapterMaterial(
      materialId,
      currentUserId,
      currentUserRole
    );

    return success(context, result, 200, "Chapter material deleted successfully");
  }

  public async createLectureMaterial(
    context: Context<AppBindings>,
    lectureId: string,
    input: Parameters<ContentService["createLectureMaterial"]>[1],
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const material = await this.contentService.createLectureMaterial(
      lectureId,
      input,
      currentUserId,
      currentUserRole
    );

    return success(context, material, 201, "Lecture material created successfully");
  }

  public async updateLectureMaterial(
    context: Context<AppBindings>,
    materialId: string,
    input: Parameters<ContentService["updateLectureMaterial"]>[1],
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const material = await this.contentService.updateLectureMaterial(
      materialId,
      input,
      currentUserId,
      currentUserRole
    );

    return success(context, material, 200, "Lecture material updated successfully");
  }

  public async deleteLectureMaterial(
    context: Context<AppBindings>,
    materialId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const result = await this.contentService.deleteLectureMaterial(
      materialId,
      currentUserId,
      currentUserRole
    );

    return success(context, result, 200, "Lecture material deleted successfully");
  }
}
