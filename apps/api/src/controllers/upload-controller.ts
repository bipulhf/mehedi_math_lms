import type { Context } from "hono";

import {
  UploadService,
  type CreateProfilePhotoUploadRequest
} from "@/services/upload-service";
import type { AppBindings } from "@/types/app-bindings";
import { success } from "@/utils/response";

export class UploadController {
  public constructor(private readonly uploadService: UploadService) {}

  public async createProfilePhotoUpload(
    context: Context<AppBindings>,
    input: CreateProfilePhotoUploadRequest
  ): Promise<Response> {
    const payload = await this.uploadService.createProfilePhotoUpload(input);

    return success(context, payload, 201, "Profile photo upload prepared successfully");
  }

  public async createBugScreenshotUpload(
    context: Context<AppBindings>,
    input: CreateProfilePhotoUploadRequest
  ): Promise<Response> {
    const payload = await this.uploadService.createBugScreenshotUpload(input);

    return success(context, payload, 201, "Bug screenshot upload prepared successfully");
  }

  public async createCourseCoverUpload(
    context: Context<AppBindings>,
    input: CreateProfilePhotoUploadRequest
  ): Promise<Response> {
    const payload = await this.uploadService.createCourseCoverUpload(input);

    return success(context, payload, 201, "Course cover upload prepared successfully");
  }

  public async createCourseMaterialUpload(
    context: Context<AppBindings>,
    input: CreateProfilePhotoUploadRequest
  ): Promise<Response> {
    const payload = await this.uploadService.createCourseMaterialUpload(input);

    return success(context, payload, 201, "Course material upload prepared successfully");
  }

  public async createLectureVideoUpload(
    context: Context<AppBindings>,
    input: CreateProfilePhotoUploadRequest
  ): Promise<Response> {
    const payload = await this.uploadService.createLectureVideoUpload(input);

    return success(context, payload, 201, "Lecture video upload prepared successfully");
  }
}
