import type { RaiseScriptChallengeInput, UserRole } from "@genex/shared";
import type { Context } from "hono";

import type { ScriptChallengeService } from "@/services/script-challenge-service";
import type { AppBindings } from "@/types/app-bindings";
import { success } from "@/utils/response";

export class ScriptChallengeController {
  public constructor(private readonly scriptChallengeService: ScriptChallengeService) {}

  public async raise(
    context: Context<AppBindings>,
    submissionId: string,
    payload: RaiseScriptChallengeInput,
    userId: string,
    userRole: UserRole
  ): Promise<Response> {
    const challenge = await this.scriptChallengeService.raise(
      submissionId,
      payload,
      userId,
      userRole
    );

    return success(context, challenge, 201, "Challenge raised");
  }

  public async listForSubmission(
    context: Context<AppBindings>,
    submissionId: string,
    userId: string,
    userRole: UserRole
  ): Promise<Response> {
    const items = await this.scriptChallengeService.listForSubmission(
      submissionId,
      userId,
      userRole
    );

    return success(context, { items });
  }
}
