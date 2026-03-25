import type { Context } from "hono";
import type { UserRole } from "@mma/shared";

import { TestService } from "@/services/test-service";
import type { AppBindings } from "@/types/app-bindings";
import { success } from "@/utils/response";

export class TestController {
  public constructor(private readonly testService: TestService) {}

  public async listCourseAssessments(
    context: Context<AppBindings>,
    courseId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.testService.listCourseAssessments(courseId, currentUserId, currentUserRole);

    return success(context, data);
  }

  public async createTest(
    context: Context<AppBindings>,
    chapterId: string,
    input: Parameters<TestService["createTest"]>[1],
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.testService.createTest(chapterId, input, currentUserId, currentUserRole);

    return success(context, data, 201, "Test created successfully");
  }

  public async getTestDetail(
    context: Context<AppBindings>,
    testId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.testService.getTestDetail(testId, currentUserId, currentUserRole);

    return success(context, data);
  }

  public async updateTest(
    context: Context<AppBindings>,
    testId: string,
    input: Parameters<TestService["updateTest"]>[1],
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.testService.updateTest(testId, input, currentUserId, currentUserRole);

    return success(context, data, 200, "Test updated successfully");
  }

  public async deleteTest(
    context: Context<AppBindings>,
    testId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.testService.deleteTest(testId, currentUserId, currentUserRole);

    return success(context, data, 200, "Test deleted successfully");
  }

  public async createQuestion(
    context: Context<AppBindings>,
    testId: string,
    input: Parameters<TestService["createQuestion"]>[1],
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.testService.createQuestion(testId, input, currentUserId, currentUserRole);

    return success(context, data, 201, "Question created successfully");
  }

  public async updateQuestion(
    context: Context<AppBindings>,
    questionId: string,
    input: Parameters<TestService["updateQuestion"]>[1],
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.testService.updateQuestion(questionId, input, currentUserId, currentUserRole);

    return success(context, data, 200, "Question updated successfully");
  }

  public async deleteQuestion(
    context: Context<AppBindings>,
    questionId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.testService.deleteQuestion(questionId, currentUserId, currentUserRole);

    return success(context, data, 200, "Question deleted successfully");
  }

  public async reorderQuestions(
    context: Context<AppBindings>,
    testId: string,
    input: Parameters<TestService["reorderQuestions"]>[1],
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.testService.reorderQuestions(testId, input, currentUserId, currentUserRole);

    return success(context, data, 200, "Question order updated successfully");
  }

  public async startSubmission(
    context: Context<AppBindings>,
    testId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.testService.startSubmission(testId, currentUserId, currentUserRole);

    return success(context, data, 201, "Submission started successfully");
  }

  public async saveSubmissionAnswers(
    context: Context<AppBindings>,
    submissionId: string,
    input: Parameters<TestService["saveSubmissionAnswers"]>[1],
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.testService.saveSubmissionAnswers(
      submissionId,
      input,
      currentUserId,
      currentUserRole
    );

    return success(context, data, 200, "Submission answers saved successfully");
  }

  public async submitTest(
    context: Context<AppBindings>,
    testId: string,
    input: Parameters<TestService["submitTest"]>[1],
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.testService.submitTest(testId, input, currentUserId, currentUserRole);

    return success(context, data, 200, "Test submitted successfully");
  }

  public async listSubmissions(
    context: Context<AppBindings>,
    testId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.testService.listSubmissions(testId, currentUserId, currentUserRole);

    return success(context, data);
  }

  public async getSubmissionDetail(
    context: Context<AppBindings>,
    submissionId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.testService.getSubmissionDetail(
      submissionId,
      currentUserId,
      currentUserRole
    );

    return success(context, data);
  }

  public async gradeSubmission(
    context: Context<AppBindings>,
    submissionId: string,
    input: Parameters<TestService["gradeSubmission"]>[1],
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.testService.gradeSubmission(
      submissionId,
      input,
      currentUserId,
      currentUserRole
    );

    return success(context, data, 200, "Submission graded successfully");
  }
}
