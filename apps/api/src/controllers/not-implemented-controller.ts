import type { Context } from "hono";

import { NotImplementedService } from "@/services/not-implemented-service";
import type { AppBindings } from "@/types/app-bindings";
import { success } from "@/utils/response";

export class NotImplementedController {
  public constructor(private readonly notImplementedService: NotImplementedService) {}

  public handle(context: Context<AppBindings>, namespace: string): Response {
    return success(context, this.notImplementedService.getPayload(namespace), 501);
  }
}
