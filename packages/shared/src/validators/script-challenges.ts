import { z } from "zod";

import { idSchema } from "./common";

/**
 * A student's grounds for asking that their script be looked at again.
 *
 * A floor of 20 characters is deliberate: a challenge sends a whole paper back
 * to the teacher who marked it, and "wrong" does not tell them which part to
 * look at. The ceiling is generous — a student explaining a maths answer needs
 * room.
 */
export const raiseScriptChallengeSchema = z.object({
  reason: z.string().trim().min(20).max(2000)
});

export const resolveScriptChallengeSchema = z.object({
  response: z.string().trim().max(2000).nullish()
});

export const scriptChallengeIdParamsSchema = z.object({
  id: idSchema
});

export const scriptChallengeStatusValues = ["OPEN", "RESOLVED"] as const;
export const scriptChallengeStatusSchema = z.enum(scriptChallengeStatusValues);

export type RaiseScriptChallengeInput = z.infer<typeof raiseScriptChallengeSchema>;
export type ResolveScriptChallengeInput = z.infer<typeof resolveScriptChallengeSchema>;
export type ScriptChallengeStatus = z.infer<typeof scriptChallengeStatusSchema>;
