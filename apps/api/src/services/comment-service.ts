import type { UserRole } from "@mma/shared";

import { CommentRepository, type CommentRecord } from "@/repositories/comment-repository";
import { ContentRepository } from "@/repositories/content-repository";
import { CourseRepository } from "@/repositories/course-repository";
import { EnrollmentRepository } from "@/repositories/enrollment-repository";
import { ForbiddenError, NotFoundError, ValidationError } from "@/utils/errors";

export interface CommentView {
  content: string | null;
  createdAt: string;
  id: string;
  isDeleted: boolean;
  isEditable: boolean;
  isOwn: boolean;
  lectureId: string;
  parentId: string | null;
  replies: readonly CommentView[];
  updatedAt: string;
  user: {
    id: string;
    image: string | null;
    name: string;
    role: "STUDENT" | "TEACHER" | "ACCOUNTANT" | "ADMIN";
  };
}

function mapComment(
  record: CommentRecord,
  currentUserId: string,
  currentUserRole: UserRole,
  replies: readonly CommentView[]
): CommentView {
  const isOwn = record.userId === currentUserId;
  const isAdmin = currentUserRole === "ADMIN";

  return {
    content: record.isDeleted ? null : record.content,
    createdAt: record.createdAt.toISOString(),
    id: record.id,
    isDeleted: record.isDeleted,
    isEditable: !record.isDeleted && (isOwn || isAdmin),
    isOwn,
    lectureId: record.lectureId,
    parentId: record.parentId,
    replies,
    updatedAt: record.updatedAt.toISOString(),
    user: record.user
  };
}

export class CommentService {
  public constructor(
    private readonly commentRepository: CommentRepository,
    private readonly contentRepository: ContentRepository,
    private readonly courseRepository: CourseRepository,
    private readonly enrollmentRepository: EnrollmentRepository
  ) {}

  private async requireLectureDiscussionAccess(
    lectureId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<{ courseId: string; lectureId: string }> {
    if (
      currentUserRole !== "STUDENT" &&
      currentUserRole !== "TEACHER" &&
      currentUserRole !== "ADMIN"
    ) {
      throw new ForbiddenError("You do not have permission to access lecture discussions");
    }

    const lecture = await this.contentRepository.findLectureById(lectureId);

    if (!lecture) {
      throw new NotFoundError("Lecture not found");
    }

    if (currentUserRole === "STUDENT") {
      const hasAccess = await this.enrollmentRepository.hasCourseAccess(
        currentUserId,
        lecture.courseId
      );

      if (!hasAccess) {
        throw new ForbiddenError("You do not have access to this lecture discussion");
      }

      return {
        courseId: lecture.courseId,
        lectureId: lecture.id
      };
    }

    if (currentUserRole === "ADMIN") {
      return {
        courseId: lecture.courseId,
        lectureId: lecture.id
      };
    }

    const course = await this.courseRepository.findById(lecture.courseId);

    if (!course) {
      throw new NotFoundError("Course not found");
    }

    const canManage =
      course.creator.id === currentUserId ||
      course.teachers.some((teacher) => teacher.id === currentUserId);

    if (!canManage) {
      throw new ForbiddenError("You do not have access to this lecture discussion");
    }

    return {
      courseId: lecture.courseId,
      lectureId: lecture.id
    };
  }

  public async listLectureComments(
    lectureId: string,
    query: { limit: number; page: number },
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<{ items: readonly CommentView[]; limit: number; page: number; total: number }> {
    await this.requireLectureDiscussionAccess(lectureId, currentUserId, currentUserRole);

    const offset = (query.page - 1) * query.limit;
    const [roots, total] = await Promise.all([
      this.commentRepository.listRootCommentsByLecture(lectureId, {
        limit: query.limit,
        offset
      }),
      this.commentRepository.countRootCommentsByLecture(lectureId)
    ]);
    const replies = await this.commentRepository.listRepliesByParentIds(roots.map((root) => root.id));
    const repliesByParentId = new Map<string, CommentRecord[]>();

    for (const reply of replies) {
      const currentReplies = repliesByParentId.get(reply.parentId ?? "") ?? [];
      currentReplies.push(reply);
      repliesByParentId.set(reply.parentId ?? "", currentReplies);
    }

    return {
      items: roots.map((root) =>
        mapComment(
          root,
          currentUserId,
          currentUserRole,
          (repliesByParentId.get(root.id) ?? []).map((reply) =>
            mapComment(reply, currentUserId, currentUserRole, [])
          )
        )
      ),
      limit: query.limit,
      page: query.page,
      total
    };
  }

  public async createComment(
    lectureId: string,
    input: { content: string; parentId?: string | undefined },
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<CommentView> {
    await this.requireLectureDiscussionAccess(lectureId, currentUserId, currentUserRole);

    let parentId: string | null = null;

    if (input.parentId) {
      const parentComment = await this.commentRepository.findById(input.parentId);

      if (!parentComment || parentComment.lectureId !== lectureId) {
        throw new ValidationError("Reply target is invalid", [
          {
            field: "parentId",
            message: "Choose a comment from this lecture"
          }
        ]);
      }

      if (parentComment.parentId !== null) {
        throw new ValidationError("Reply depth exceeded", [
          {
            field: "parentId",
            message: "Replies can only be attached to top-level comments"
          }
        ]);
      }

      parentId = parentComment.id;
    }

    const comment = await this.commentRepository.create({
      content: input.content.trim(),
      lectureId,
      parentId,
      userId: currentUserId
    });

    return mapComment(comment, currentUserId, currentUserRole, []);
  }

  public async updateComment(
    commentId: string,
    input: { content: string },
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<CommentView> {
    const comment = await this.commentRepository.findById(commentId);

    if (!comment) {
      throw new NotFoundError("Comment not found");
    }

    await this.requireLectureDiscussionAccess(comment.lectureId, currentUserId, currentUserRole);

    if (comment.userId !== currentUserId && currentUserRole !== "ADMIN") {
      throw new ForbiddenError("You do not have permission to edit this comment");
    }

    if (comment.isDeleted) {
      throw new ValidationError("Deleted comments cannot be edited");
    }

    const updatedComment = await this.commentRepository.update(commentId, input.content.trim());

    return mapComment(updatedComment, currentUserId, currentUserRole, []);
  }

  public async deleteComment(
    commentId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<{ id: string }> {
    const comment = await this.commentRepository.findById(commentId);

    if (!comment) {
      throw new NotFoundError("Comment not found");
    }

    await this.requireLectureDiscussionAccess(comment.lectureId, currentUserId, currentUserRole);

    if (comment.userId !== currentUserId && currentUserRole !== "ADMIN") {
      throw new ForbiddenError("You do not have permission to delete this comment");
    }

    if (!comment.isDeleted) {
      await this.commentRepository.softDelete(commentId);
    }

    return { id: commentId };
  }
}
