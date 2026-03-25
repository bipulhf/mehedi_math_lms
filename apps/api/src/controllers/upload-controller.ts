import type { Context } from "hono";
import type { AuthUser } from "@mma/auth";

import {
  UploadService,
  type ConfirmUploadRequest,
  type CreatePresignedUploadRequest
} from "@/services/upload-service";
import type { AppBindings } from "@/types/app-bindings";
import { success } from "@/utils/response";

export class UploadController {
  public constructor(private readonly uploadService: UploadService) {}

  public async createPresignedUpload(
    context: Context<AppBindings>,
    actor: AuthUser,
    input: CreatePresignedUploadRequest
  ): Promise<Response> {
    const payload = await this.uploadService.createPresignedUpload(actor, input);

    return success(context, payload, 201, "Upload prepared successfully");
  }

  public async confirmUpload(
    context: Context<AppBindings>,
    actor: AuthUser,
    input: ConfirmUploadRequest
  ): Promise<Response> {
    const payload = await this.uploadService.confirmUpload(actor, input);

    return success(context, payload, 200, "Upload confirmed successfully");
  }

  public async deleteUpload(
    context: Context<AppBindings>,
    actor: AuthUser,
    uploadId: string
  ): Promise<Response> {
    await this.uploadService.deleteUpload(actor, uploadId);

    return success(context, { id: uploadId }, 200, "Upload deleted successfully");
  }
}
