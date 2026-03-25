import type { Context } from "hono";

import { StaffAccountService, type CreateStaffAccountRequest } from "@/services/staff-account-service";
import type { AppBindings } from "@/types/app-bindings";
import { success } from "@/utils/response";

export class AdminController {
  public constructor(private readonly staffAccountService: StaffAccountService) {}

  public async createStaffAccount(
    context: Context<AppBindings>,
    input: CreateStaffAccountRequest
  ): Promise<Response> {
    const createdStaffAccount = await this.staffAccountService.createStaffAccount(input);

    return success(context, createdStaffAccount, 201, "Staff account created successfully");
  }
}
