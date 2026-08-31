import { courseRoutines, db, eq, users } from "@genex/db";

export interface CourseRoutineRecord {
  attachmentName: string | null;
  attachmentUrl: string | null;
  content: string | null;
  courseId: string;
  createdAt: Date;
  id: string;
  updatedAt: Date;
  updatedById: string;
}

export interface CourseRoutineWithAuthor extends CourseRoutineRecord {
  updatedByName: string;
}

export interface CourseRoutineValues {
  attachmentName: string | null;
  attachmentUrl: string | null;
  content: string | null;
}

export class CourseRoutineRepository {
  public async findByCourseId(courseId: string): Promise<CourseRoutineWithAuthor | null> {
    const [row] = await db
      .select({
        attachmentName: courseRoutines.attachmentName,
        attachmentUrl: courseRoutines.attachmentUrl,
        content: courseRoutines.content,
        courseId: courseRoutines.courseId,
        createdAt: courseRoutines.createdAt,
        id: courseRoutines.id,
        updatedAt: courseRoutines.updatedAt,
        updatedById: courseRoutines.updatedById,
        updatedByName: users.name
      })
      .from(courseRoutines)
      .innerJoin(users, eq(courseRoutines.updatedById, users.id))
      .where(eq(courseRoutines.courseId, courseId))
      .limit(1);

    return row ?? null;
  }

  /**
   * One routine per course, so a save is an upsert on `course_id` rather than
   * a create/update pair the caller has to choose between. The unique index is
   * the conflict target, which also closes the race two teachers saving at the
   * same moment would otherwise open.
   */
  public async upsert(
    courseId: string,
    updatedById: string,
    values: CourseRoutineValues
  ): Promise<CourseRoutineRecord> {
    const [row] = await db
      .insert(courseRoutines)
      .values({
        attachmentName: values.attachmentName,
        attachmentUrl: values.attachmentUrl,
        content: values.content,
        courseId,
        updatedById
      })
      .onConflictDoUpdate({
        set: {
          attachmentName: values.attachmentName,
          attachmentUrl: values.attachmentUrl,
          content: values.content,
          updatedAt: new Date(),
          updatedById
        },
        target: courseRoutines.courseId
      })
      .returning();

    if (!row) {
      throw new Error("Failed to save course routine");
    }

    return row;
  }

  public async deleteByCourseId(courseId: string): Promise<boolean> {
    const result = await db
      .delete(courseRoutines)
      .where(eq(courseRoutines.courseId, courseId))
      .returning({ id: courseRoutines.id });

    return result.length > 0;
  }
}
