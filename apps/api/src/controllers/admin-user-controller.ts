import type { Context } from "hono";

import type { CreateStaffAccountRequest } from "@/services/staff-account-service";
import { AdminUserService } from "@/services/admin-user-service";
import type { AppBindings } from "@/types/app-bindings";
import { paginated, success } from "@/utils/response";

export class AdminUserController {
  public constructor(private readonly adminUserService: AdminUserService) {}

  public async listUsers(
    context: Context<AppBindings>,
    query: Parameters<AdminUserService["listUsers"]>[0]
  ): Promise<Response> {
    const result = await this.adminUserService.listUsers(query);

    return paginated(context, result.items, {
      limit: query.limit,
      page: query.page,
      pages: Math.max(1, Math.ceil(result.total / query.limit)),
      total: result.total
    });
  }

  public async getUserById(context: Context<AppBindings>, userId: string): Promise<Response> {
    const user = await this.adminUserService.getUserById(userId);

    return success(context, user);
  }

  public async createUser(
    context: Context<AppBindings>,
    input: CreateStaffAccountRequest
  ): Promise<Response> {
    const createdUser = await this.adminUserService.createUser(input);

    return success(context, createdUser, 201, "Staff account created successfully");
  }

  public async updateUser(
    context: Context<AppBindings>,
    userId: string,
    input: Parameters<AdminUserService["updateUser"]>[1]
  ): Promise<Response> {
    const updatedUser = await this.adminUserService.updateUser(userId, input);

    return success(context, updatedUser, 200, "User updated successfully");
  }

  public async updateUserStatus(
    context: Context<AppBindings>,
    userId: string,
    currentUserId: string,
    isActive: boolean
  ): Promise<Response> {
    const updatedUser = await this.adminUserService.updateUserStatus(userId, currentUserId, isActive);

    return success(context, updatedUser, 200, "User status updated successfully");
  }

  public async deleteUser(
    context: Context<AppBindings>,
    userId: string,
    currentUserId: string
  ): Promise<Response> {
    const deletedUser = await this.adminUserService.softDeleteUser(userId, currentUserId);

    return success(context, deletedUser, 200, "User deleted successfully");
  }
}
