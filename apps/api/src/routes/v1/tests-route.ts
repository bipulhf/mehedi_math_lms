import { Hono } from "hono";
import {
  createQuestionSchema,
  gradeSubmissionSchema,
  reorderQuestionsSchema,
  saveSubmissionAnswersSchema,
  submissionIdParamsSchema,
  submitTestSchema,
  testDetailQuerySchema,
  testIdParamsSchema,
  testQuestionParamsSchema,
  updateTestSchema
} from "@genex/shared";
import type { UserRole } from "@genex/shared";

import { auditLogService, testController } from "@/lib/container";
import { requireAuth, requireRole } from "@/middleware/auth";
import type { AppBindings } from "@/types/app-bindings";
import { extractCreatedId } from "@/utils/audit";

export const testsRoutes = new Hono<AppBindings>();

testsRoutes.get("/:id", requireAuth(), (context) => {
  const params = testIdParamsSchema.parse(context.req.param());
  const query = testDetailQuerySchema.parse(context.req.query());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return testController.getTestDetail(
    context,
    params.id,
    authUser!.id,
    authSession!.role as UserRole,
    query.revealAnswers
  );
});

testsRoutes.put("/:id", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = testIdParamsSchema.parse(context.req.param());
  const payload = updateTestSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  const response = await testController.updateTest(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "test.updated",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "test"
  });

  return response;
});

testsRoutes.delete("/:id", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = testIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  const response = await testController.deleteTest(
    context,
    params.id,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "test.deleted",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "test"
  });

  return response;
});

testsRoutes.post("/:testId/questions", requireRole("ADMIN", "TEACHER"), async (context) => {
  const params = testQuestionParamsSchema.parse(context.req.param());
  const payload = createQuestionSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  const response = await testController.createQuestion(
    context,
    params.testId,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "test_question.created",
    actorId: authUser!.id,
    entityId: await extractCreatedId(response),
    entityType: "test_question",
    metadata: { testId: params.testId }
  });

  return response;
});

testsRoutes.patch(
  "/:testId/questions/reorder",
  requireRole("ADMIN", "TEACHER"),
  async (context) => {
    const params = testQuestionParamsSchema.parse(context.req.param());
    const payload = reorderQuestionsSchema.parse(await context.req.json());
    const authUser = context.get("authUser");
    const authSession = context.get("authSession");

    const response = await testController.reorderQuestions(
      context,
      params.testId,
      payload,
      authUser!.id,
      authSession!.role as UserRole
    );

    auditLogService.log({
      action: "test.questions_reordered",
      actorId: authUser!.id,
      entityId: params.testId,
      entityType: "test"
    });

    return response;
  }
);

testsRoutes.post("/:id/submissions/start", requireAuth(), async (context) => {
  const params = testIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  const response = await testController.startSubmission(
    context,
    params.id,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "test_submission.started",
    actorId: authUser!.id,
    entityId: await extractCreatedId(response),
    entityType: "test_submission",
    metadata: { testId: params.id }
  });

  return response;
});

testsRoutes.post("/:id/submit", requireAuth(), async (context) => {
  const params = testIdParamsSchema.parse(context.req.param());
  const payload = submitTestSchema.parse(await context.req.json());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  const response = await testController.submitTest(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "test_submission.submitted",
    actorId: authUser!.id,
    entityId: await extractCreatedId(response),
    entityType: "test_submission",
    metadata: { testId: params.id }
  });

  return response;
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

testsRoutes.get("/:id/submissions/mine", requireAuth(), (context) => {
  const params = testIdParamsSchema.parse(context.req.param());
  const authUser = context.get("authUser");
  const authSession = context.get("authSession");

  return testController.listMySubmissions(
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

  const response = await testController.saveSubmissionAnswers(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "test_submission.answers_saved",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "test_submission"
  });

  return response;
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

  const response = await testController.gradeSubmission(
    context,
    params.id,
    payload,
    authUser!.id,
    authSession!.role as UserRole
  );

  auditLogService.log({
    action: "test_submission.graded",
    actorId: authUser!.id,
    entityId: params.id,
    entityType: "test_submission"
  });

  return response;
});
