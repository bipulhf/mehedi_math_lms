import type { ContentfulStatusCode } from "hono/utils/http-status";

export interface ValidationIssue {
  field: string;
  message: string;
}

export class AppError extends Error {
  public readonly statusCode: ContentfulStatusCode;

  public readonly issues: readonly ValidationIssue[] | undefined;

  public constructor(
    message: string,
    statusCode: ContentfulStatusCode = 500,
    issues?: readonly ValidationIssue[]
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.issues = issues;
  }
}

export class ValidationError extends AppError {
  public constructor(message: string, issues?: readonly ValidationIssue[]) {
    super(message, 400, issues);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  public constructor(message = "Resource not found") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AppError {
  public constructor(message = "Unauthorized") {
    super(message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  public constructor(message = "Forbidden") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

export class ConflictError extends AppError {
  public constructor(message = "Conflict") {
    super(message, 409);
    this.name = "ConflictError";
  }
}
