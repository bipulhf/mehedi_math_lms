import { generateUniqueSlug, type UserRole } from "@mma/shared";

import { AuthSessionRepository } from "@/repositories/auth-session-repository";
import {
  AdminUserRepository,
  type AdminUserDetailRecord,
  type AdminUserListRecord,
  type AdminUsersQuery,
  type UpdateAdminUserInput
} from "@/repositories/admin-user-repository";
import {
  StaffAccountService,
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

  public async createUser(input: CreateStaffAccountRequest): Promise<CreatedStaffAccount> {
    return this.staffAccountService.createStaffAccount(input);
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

  public async softDeleteUser(
    targetUserId: string,
    currentUserId: string
  ): Promise<AdminUserListRecord> {
    if (targetUserId === currentUserId) {
      throw new ForbiddenError("You cannot delete your own account");
    }

    const user = await this.adminUserRepository.softDeleteUser(targetUserId);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    await this.authSessionRepository.deleteByUserId(targetUserId);

    return user;
  }
}
