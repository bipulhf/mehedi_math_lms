import type { Context } from "hono";

import type { AppBindings } from "@/types/app-bindings";
import { success } from "@/utils/response";

export class AuthController {
  public getSession(context: Context<AppBindings>): Response {
    return success(context, {
      session: context.get("authSession"),
      user: context.get("authUser")
    });
  }
}
