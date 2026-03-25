import { and, db, desc, eq, notices, users } from "@mma/db";

export interface NoticeRecord {
  content: string;
  courseId: string;
  createdAt: Date;
  id: string;
  isPinned: boolean;
  teacherId: string;
  title: string;
  updatedAt: Date;
}

export interface NoticeWithAuthor extends NoticeRecord {
  authorName: string;
}

export class NoticeRepository {
  public async listByCourseId(courseId: string): Promise<readonly NoticeWithAuthor[]> {
    const rows = await db
      .select({
        authorName: users.name,
        content: notices.content,
        courseId: notices.courseId,
        createdAt: notices.createdAt,
        id: notices.id,
        isPinned: notices.isPinned,
        teacherId: notices.teacherId,
        title: notices.title,
        updatedAt: notices.updatedAt
      })
      .from(notices)
      .innerJoin(users, eq(notices.teacherId, users.id))
      .where(eq(notices.courseId, courseId))
      .orderBy(desc(notices.isPinned), desc(notices.createdAt));

    return rows;
  }

  public async findById(id: string): Promise<NoticeRecord | null> {
    const [row] = await db.select().from(notices).where(eq(notices.id, id)).limit(1);

    return row ?? null;
  }

  public async create(input: {
    content: string;
    courseId: string;
    isPinned: boolean;
    teacherId: string;
    title: string;
  }): Promise<NoticeRecord> {
    const [row] = await db
      .insert(notices)
      .values({
        content: input.content,
        courseId: input.courseId,
        isPinned: input.isPinned,
        teacherId: input.teacherId,
        title: input.title
      })
      .returning();

    if (!row) {
      throw new Error("Failed to create notice");
    }

    return row;
  }

  public async update(
    id: string,
    patch: Partial<{ content: string; isPinned: boolean; title: string }>
  ): Promise<NoticeRecord | null> {
    const values: {
      content?: string;
      isPinned?: boolean;
      title?: string;
      updatedAt: Date;
    } = {
      updatedAt: new Date()
    };

    if (patch.content !== undefined) {
      values.content = patch.content;
    }

    if (patch.isPinned !== undefined) {
      values.isPinned = patch.isPinned;
    }

    if (patch.title !== undefined) {
      values.title = patch.title;
    }

    const [row] = await db.update(notices).set(values).where(eq(notices.id, id)).returning();

    return row ?? null;
  }

  public async delete(id: string): Promise<boolean> {
    const result = await db.delete(notices).where(eq(notices.id, id)).returning({ id: notices.id });

    return result.length > 0;
  }

  public async countPinnedForCourse(courseId: string): Promise<number> {
    const rows = await db
      .select({ id: notices.id })
      .from(notices)
      .where(and(eq(notices.courseId, courseId), eq(notices.isPinned, true)));

    return rows.length;
  }
}
