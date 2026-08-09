import { generateUniqueSlug } from "@mma/shared";

import type { AuthSessionRepository } from "@/repositories/auth-session-repository";
import type {
  AdminUserRepository} from "@/repositories/admin-user-repository";
import {
  type AdminUserDetailRecord,
  type AdminUserListRecord,
  type AdminUsersQuery,
  type UpdateAdminUserInput
} from "@/repositories/admin-user-repository";
import type {
  StaffAccountService} from "@/services/staff-account-service";
import {
  type CreateStaffAccountRequest,
  type CreatedStaffAccount
} from "@/services/staff-account-service";
import { ConflictError, ForbiddenError, NotFoundError } from "@/utils/errors";

export class AdminUserService {
  public constructor(
    private readonly adminUserRepository: AdminUserRepository,
    private readonly authSessionRepository: AuthSessionRepository,
    private readonly staffAccountService: StaffAccountService
  ) {}

  private async createUniqueUserSlug(
    name: string,
    excludeUserId?: string | undefined
  ): Promise<string> {
    return generateUniqueSlug(name, async (candidate) => {
      const existingUser = await this.adminUserRepository.findBySlug(candidate);

      return existingUser !== null && existingUser.id !== excludeUserId;
    });
  }

  public async listUsers(
    query: AdminUsersQuery
  ): Promise<{ items: readonly AdminUserListRecord[]; total: number }> {
    return this.adminUserRepository.listUsers(query);
  }

  public async getUserById(userId: string): Promise<AdminUserDetailRecord> {
    const user = await this.adminUserRepository.findById(userId);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return user;
  }

  public async createUser(
    input: CreateStaffAccountRequest,
    currentUserId: string
  ): Promise<CreatedStaffAccount> {
    return this.staffAccountService.createStaffAccount(input, currentUserId);
  }

  public async updateUser(
    userId: string,
    input: UpdateAdminUserInput
  ): Promise<AdminUserListRecord> {
    if (input.email) {
      const existingUser = await this.adminUserRepository.findByEmail(input.email);

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictError("A user with this email already exists");
      }
    }

    const currentUser = await this.adminUserRepository.findById(userId);

    if (!currentUser) {
      throw new NotFoundError("User not found");
    }

    if (currentUser.role === "ADMIN" && input.role) {
      throw new ForbiddenError("Admin roles cannot be reassigned from this endpoint");
    }

    const nextName = input.name?.trim();
    const shouldRegenerateSlug = nextName !== undefined && nextName !== currentUser.name;
    const slug =
      shouldRegenerateSlug || currentUser.slug === null
        ? await this.createUniqueUserSlug(nextName ?? currentUser.name, userId)
        : undefined;

    const updatedUser = await this.adminUserRepository.updateUser(userId, {
      ...input,
      name: nextName,
      slug
    });

    if (!updatedUser) {
      throw new NotFoundError("User not found");
    }

    return updatedUser;
  }

  public async updateUserStatus(
    targetUserId: string,
    currentUserId: string,
    isActive: boolean
  ): Promise<AdminUserListRecord> {
    if (targetUserId === currentUserId && isActive === false) {
      throw new ForbiddenError("You cannot deactivate your own account");
    }

    // The admin role must never be emptied — there would be no way back into
    // the platform without shell access. ADR-0002.
    if (isActive === false) {
      const targetRole = await this.adminUserRepository.findRoleById(targetUserId);

      if (targetRole === "ADMIN") {
        const activeAdmins = await this.adminUserRepository.countActiveAdmins();

        if (activeAdmins <= 1) {
          throw new ForbiddenError("You cannot deactivate the last remaining admin");
        }
      }
    }

    const updatedUser = await this.adminUserRepository.updateUserStatus(
      targetUserId,
      isActive,
      isActive ? null : "Account deactivated by admin"
    );

    if (!updatedUser) {
      throw new NotFoundError("User not found");
    }

    await this.authSessionRepository.deleteByUserId(targetUserId);

    return updatedUser;
  }

  /**
   * Physically remove an account. Deactivation is the normal off-ramp; hard
   * delete is reserved for getting useless accounts fully out of the platform.
   * A user is only removable while nothing RESTRICT-foreign-keys to them —
   * currently a course they created and an SMS batch they queued. Otherwise we
   * refuse rather than orphan or cascade rows the schema was designed to keep.
   */
  public async deleteUser(targetUserId: string, currentUserId: string): Promise<{ id: string }> {
    if (targetUserId === currentUserId) {
      throw new ForbiddenError("You cannot delete your own account");
    }

    const targetRole = await this.adminUserRepository.findRoleById(targetUserId);

    if (!targetRole) {
      throw new NotFoundError("User not found");
    }

    if (targetRole === "ADMIN") {
      const activeAdmins = await this.adminUserRepository.countActiveAdmins();

      if (activeAdmins <= 1) {
        throw new ForbiddenError("You cannot delete the last remaining admin");
      }
    }

    const coursesCreated = await this.adminUserRepository.countCoursesCreatedByUser(targetUserId);
    const smsBatchesCreated =
      await this.adminUserRepository.countSmsBatchesCreatedByUser(targetUserId);

    if (coursesCreated > 0) {
      throw new ConflictError(
        `This user created ${coursesCreated} course(s). Transfer or delete them before removing the account`
      );
    }

    if (smsBatchesCreated > 0) {
      throw new ConflictError(
        `This user queued ${smsBatchesCreated} SMS broadcast(s). Deactivate the account instead of deleting it`
      );
    }

    await this.authSessionRepository.deleteByUserId(targetUserId);
    await this.adminUserRepository.deleteUser(targetUserId);

    return { id: targetUserId };
  }
}
