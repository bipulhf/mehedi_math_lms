import { Hono } from "hono";
import {
  createQuestionSchema,
  gradeSubmissionSchema,
  reorderQuestionsSchema,
  saveSubmissionAnswersSchema,
  submissionIdParamsSchema,
  submitTestSchema,
  testIdParamsSchema,
  updateTestSchema
} from "@mma/shared";
import type { UserRole } from "@mma/shared";

import { testController } from "@/lib/container";
import { requireAuth, requireRole } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";

export const testsRoutes = new Hono<AppBindings>();

testsRoutes.get("/:id", requireAuth(), (context) => {
  const params = testIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return testController.getTestDetail(
    context,
    params.id,
    authUser!.id,
    authSession!.role as UserRole
  );
});

testsRoutes.put("/:id", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = testIdParamsSchema.parse(context.req.param());
  const payload = updateTestSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return testController.updateTest(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );
});

testsRoutes.delete("/:id", requireRole("ADMIN", "TEACHER"), (context) => {
  const params = testIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return testController.deleteTest(
    context,
    params.id,
    authUser!.id,
    authSession!.role as UserRole
  );
});

testsRoutes.post("/:testId/questions", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = testIdParamsSchema.transform((value) => ({ testId: value.id })).parse(context.req.param());
  const payload = createQuestionSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return testController.createQuestion(
    context,
    params.testId,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );
});

testsRoutes.patch("/:testId/questions/reorder", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = testIdParamsSchema.transform((value) => ({ testId: value.id })).parse(context.req.param());
  const payload = reorderQuestionsSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return testController.reorderQuestions(
    context,
    params.testId,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );
});

testsRoutes.post("/:id/submissions/start", requireAuth(), (context) => {
  const params = testIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return testController.startSubmission(
    context,
    params.id,
    authUser!.id,
    authSession!.role as UserRole
  );
});

testsRoutes.post("/:id/submit", requireAuth(), async (context) => {
  const params = testIdParamsSchema.parse(context.req.param());
  const payload = submitTestSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return testController.submitTest(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );
});

testsRoutes.get("/:id/submissions", requireRole("ADMIN", "TEACHER"), (context) => {
  const params = testIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return testController.listSubmissions(
    context,
    params.id,
    authUser!.id,
    authSession!.role as UserRole
  );
});

testsRoutes.put("/submissions/:id/answers", requireAuth(), async (context) => {
  const params = submissionIdParamsSchema.parse(context.req.param());
  const payload = saveSubmissionAnswersSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return testController.saveSubmissionAnswers(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );
});

testsRoutes.get("/submissions/:id", requireAuth(), (context) => {
  const params = submissionIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return testController.getSubmissionDetail(
    context,
    params.id,
    authUser!.id,
    authSession!.role as UserRole
  );
});

testsRoutes.put("/submissions/:id/grade", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = submissionIdParamsSchema.parse(context.req.param());
  const payload = gradeSubmissionSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return testController.gradeSubmission(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );
});
