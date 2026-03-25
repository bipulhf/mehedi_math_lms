import {
  and,
  comments,
  count,
  db,
  desc,
  eq,
  inArray,
  isNull,
  studentProfiles,
  teacherProfiles,
  users
} from "@mma/db";

export interface CommentRecord {
  content: string;
  createdAt: Date;
  id: string;
  isDeleted: boolean;
  lectureId: string;
  parentId: string | null;
  updatedAt: Date;
  user: {
    id: string;
    image: string | null;
    name: string;
    role: "STUDENT" | "TEACHER" | "ACCOUNTANT" | "ADMIN";
  };
  userId: string;
}

function mapCommentRecord(row: {
  content: string;
  createdAt: Date;
  id: string;
  isDeleted: boolean;
  lectureId: string;
  parentId: string | null;
  studentProfilePhoto: string | null;
  teacherProfilePhoto: string | null;
  updatedAt: Date;
  userId: string;
  userImage: string | null;
  userName: string;
  userRole: "STUDENT" | "TEACHER" | "ACCOUNTANT" | "ADMIN";
}): CommentRecord {
  return {
    content: row.content,
    createdAt: row.createdAt,
    id: row.id,
    isDeleted: row.isDeleted,
    lectureId: row.lectureId,
    parentId: row.parentId,
    updatedAt: row.updatedAt,
    user: {
      id: row.userId,
      image: row.teacherProfilePhoto ?? row.studentProfilePhoto ?? row.userImage,
      name: row.userName,
      role: row.userRole
    },
    userId: row.userId
  };
}

export class CommentRepository {
  private readonly baseSelect = {
    content: comments.content,
    createdAt: comments.createdAt,
    id: comments.id,
    isDeleted: comments.isDeleted,
    lectureId: comments.lectureId,
    parentId: comments.parentId,
    studentProfilePhoto: studentProfiles.profilePhoto,
    teacherProfilePhoto: teacherProfiles.profilePhoto,
    updatedAt: comments.updatedAt,
    userId: comments.userId,
    userImage: users.image,
    userName: users.name,
    userRole: users.role
  } as const;

  public async findById(id: string): Promise<CommentRecord | null> {
    const [row] = await db
      .select(this.baseSelect)
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
      .leftJoin(teacherProfiles, eq(teacherProfiles.userId, users.id))
      .where(eq(comments.id, id))
      .limit(1);

    return row ? mapCommentRecord(row) : null;
  }

  public async listRootCommentsByLecture(
    lectureId: string,
    input: { limit: number; offset: number }
  ): Promise<readonly CommentRecord[]> {
    const rows = await db
      .select(this.baseSelect)
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
      .leftJoin(teacherProfiles, eq(teacherProfiles.userId, users.id))
      .where(and(eq(comments.lectureId, lectureId), isNull(comments.parentId)))
      .orderBy(desc(comments.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    return rows.map(mapCommentRecord);
  }

  public async countRootCommentsByLecture(lectureId: string): Promise<number> {
    const rows = await db
      .select({ value: count() })
      .from(comments)
      .where(and(eq(comments.lectureId, lectureId), isNull(comments.parentId)));

    return rows[0]?.value ?? 0;
  }

  public async listRepliesByParentIds(parentIds: readonly string[]): Promise<readonly CommentRecord[]> {
    if (parentIds.length === 0) {
      return [];
    }

    const rows = await db
      .select(this.baseSelect)
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
      .leftJoin(teacherProfiles, eq(teacherProfiles.userId, users.id))
      .where(inArray(comments.parentId, [...parentIds]))
      .orderBy(comments.createdAt);

    return rows.map(mapCommentRecord);
  }

  public async create(input: {
    content: string;
    lectureId: string;
    parentId: string | null;
    userId: string;
  }): Promise<CommentRecord> {
    const [row] = await db
      .insert(comments)
      .values({
        content: input.content,
        lectureId: input.lectureId,
        parentId: input.parentId,
        userId: input.userId
      })
      .returning({ id: comments.id });

    if (!row) {
      throw new Error("Failed to create comment");
    }

    const comment = await this.findById(row.id);

    if (!comment) {
      throw new Error("Failed to load created comment");
    }

    return comment;
  }

  public async update(id: string, content: string): Promise<CommentRecord> {
    const [row] = await db
      .update(comments)
      .set({
        content,
        updatedAt: new Date()
      })
      .where(eq(comments.id, id))
      .returning({ id: comments.id });

    if (!row) {
      throw new Error("Failed to update comment");
    }

    const comment = await this.findById(row.id);

    if (!comment) {
      throw new Error("Failed to load updated comment");
    }

    return comment;
  }

  public async softDelete(id: string): Promise<CommentRecord> {
    const [row] = await db
      .update(comments)
      .set({
        content: "",
        isDeleted: true,
        updatedAt: new Date()
      })
      .where(eq(comments.id, id))
      .returning({ id: comments.id });

    if (!row) {
      throw new Error("Failed to delete comment");
    }

    const comment = await this.findById(row.id);

    if (!comment) {
      throw new Error("Failed to load deleted comment");
    }

    return comment;
  }
}
