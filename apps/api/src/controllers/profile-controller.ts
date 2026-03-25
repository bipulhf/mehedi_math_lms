import type { Context } from "hono";
import {
  basicProfileInputSchema,
  studentProfileInputSchema,
  teacherProfileInputSchema
} from "@mma/shared";
import type { z } from "zod";

import {
  ProfileService,
  type OwnProfileResponse,
  type PublicTeacherProfileResponse
} from "@/services/profile-service";
import type { AppBindings } from "@/types/app-bindings";
import { success } from "@/utils/response";

export class ProfileController {
  public constructor(private readonly profileService: ProfileService) {}

  public async getOwnProfile(context: Context<AppBindings>, userId: string): Promise<Response> {
    const profile = await this.profileService.getOwnProfile(userId);

    return success(context, profile);
  }

  public updateProfileResponse(
    context: Context<AppBindings>,
    profile: OwnProfileResponse,
    message: string
  ): Response {
    return success(context, profile, 200, message);
  }

  public async updateStudentProfile(
    context: Context<AppBindings>,
    userId: string,
    input: z.infer<typeof studentProfileInputSchema>
  ): Promise<Response> {
    const profile = await this.profileService.updateStudentProfile(userId, input);

    return this.updateProfileResponse(context, profile, "Profile updated successfully");
  }

  public async updateTeacherProfile(
    context: Context<AppBindings>,
    userId: string,
    input: z.infer<typeof teacherProfileInputSchema>
  ): Promise<Response> {
    const profile = await this.profileService.updateTeacherProfile(userId, input);

    return this.updateProfileResponse(context, profile, "Profile updated successfully");
  }

  public async updateBasicProfile(
    context: Context<AppBindings>,
    userId: string,
    input: z.infer<typeof basicProfileInputSchema>
  ): Promise<Response> {
    const profile = await this.profileService.updateBasicProfile(userId, input);

    return this.updateProfileResponse(context, profile, "Profile updated successfully");
  }

  public async getPublicTeacherProfile(context: Context<AppBindings>, userId: string): Promise<Response> {
    const profile = await this.profileService.getPublicTeacherProfile(userId);

    return success(context, profile as PublicTeacherProfileResponse);
  }

  public async getPublicTeacherProfileBySlug(context: Context<AppBindings>, slug: string): Promise<Response> {
    const profile = await this.profileService.getPublicTeacherProfileBySlug(slug);

    return success(context, profile as PublicTeacherProfileResponse);
  }

  public async getAdminStudentProfile(context: Context<AppBindings>, userId: string): Promise<Response> {
    const profile = await this.profileService.getAdminStudentProfile(userId);

    return success(context, profile);
  }
}
