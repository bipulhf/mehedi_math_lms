import type { Context } from "hono";

import type { StaffAccountService} from "@/services/staff-account-service";
import { type CreateStaffAccountRequest } from "@/services/staff-account-service";
import type { AppBindings } from "@/types/app-bindings";
import { success } from "@/utils/response";

export class AdminController {
  public constructor(private readonly staffAccountService: StaffAccountService) {}

  public async createStaffAccount(
    context: Context<AppBindings>,
    input: CreateStaffAccountRequest,
    currentUserId: string
  ): Promise<Response> {
    const createdStaffAccount = await this.staffAccountService.createStaffAccount(
      input,
      currentUserId
    );

    return success(context, createdStaffAccount, 201, "Staff account created successfully");
  }
}
