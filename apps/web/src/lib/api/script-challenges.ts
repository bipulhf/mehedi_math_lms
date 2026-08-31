import type { RaiseScriptChallengeInput, ScriptChallengeStatus } from "@genex/shared";

import { apiGet, apiPost } from "@/lib/api/client";

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
  const response = await apiGet<{ items: readonly ScriptChallenge[] }>(
    `tests/submissions/${submissionId}/challenges`
  );

  return response.data.items;
}

export async function raiseScriptChallenge(
  submissionId: string,
  input: RaiseScriptChallengeInput
): Promise<ScriptChallenge> {
  const response = await apiPost<RaiseScriptChallengeInput, ScriptChallenge>(
    `tests/submissions/${submissionId}/challenge`,
    input
  );

  return response.data;
}
