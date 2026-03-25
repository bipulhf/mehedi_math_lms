import type { Context } from "hono";
import type { UserRole } from "@mma/shared";

import { CommentService } from "@/services/comment-service";
import type { AppBindings } from "@/types/app-bindings";
import { paginated, success } from "@/utils/response";

export class CommentController {
  public constructor(private readonly commentService: CommentService) {}

  public async listLectureComments(
    context: Context<AppBindings>,
    lectureId: string,
    query: { limit: number; page: number },
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const result = await this.commentService.listLectureComments(
      lectureId,
      query,
      currentUserId,
      currentUserRole
    );

    return paginated(context, result.items, {
      limit: result.limit,
      page: result.page,
      pages: Math.ceil(result.total / result.limit) || 1,
      total: result.total
    });
  }

  public async createComment(
    context: Context<AppBindings>,
    lectureId: string,
    input: { content: string; parentId?: string | undefined },
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.commentService.createComment(
      lectureId,
      input,
      currentUserId,
      currentUserRole
    );

    return success(context, data, 201, "Comment created successfully");
  }

  public async updateComment(
    context: Context<AppBindings>,
    commentId: string,
    input: { content: string },
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.commentService.updateComment(
      commentId,
      input,
      currentUserId,
      currentUserRole
    );

    return success(context, data, 200, "Comment updated successfully");
  }

  public async deleteComment(
    context: Context<AppBindings>,
    commentId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const data = await this.commentService.deleteComment(
      commentId,
      currentUserId,
      currentUserRole
    );

    return success(context, data, 200, "Comment deleted successfully");
  }
}
