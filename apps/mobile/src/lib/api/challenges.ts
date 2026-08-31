import type { RaiseScriptChallengeInput, ScriptChallengeStatus } from "@mma/shared";

import { apiGet, apiPost } from "@/src/lib/api-client";

/** A student's dispute of the marking on their own answer script. */

export interface ScriptChallenge {
  assignedTeacher: {
    id: string;
    name: string;
  };
  createdAt: string;
  id: string;
  reason: string;
  resolvedAt: string | null;
  response: string | null;
  scoreAfterReview: number | null;
  scoreAtChallenge: number | null;
  status: ScriptChallengeStatus;
  submissionId: string;
}

/** Newest first, so `[0]` is the challenge that matters. */
export async function listScriptChallenges(
  submissionId: string
): Promise<readonly ScriptChallenge[]> {
  const data = await apiGet<{ items: readonly ScriptChallenge[] }>(
    `tests/submissions/${submissionId}/challenges`
  );

  return data.items;
}

export async function raiseScriptChallenge(
  submissionId: string,
  input: RaiseScriptChallengeInput
): Promise<ScriptChallenge> {
  return apiPost<RaiseScriptChallengeInput, ScriptChallenge>(
    `tests/submissions/${submissionId}/challenge`,
    input
  );
}
