import { and, count, db, desc, eq, inArray, reviews, sql, users } from "@mma/db";

export interface ReviewRecord {
  comment: string | null;
  courseId: string;
  createdAt: Date;
  id: string;
  rating: number;
  updatedAt: Date;
  userId: string;
}

export interface ReviewWithAuthor extends ReviewRecord {
  authorName: string;
}

export class ReviewRepository {
  public async listByCourseId(
    courseId: string,
    params: { limit: number; page: number }
  ): Promise<{ items: readonly ReviewWithAuthor[]; total: number }> {
    const offset = (params.page - 1) * params.limit;

    const [totalRow] = await db
      .select({ value: count() })
      .from(reviews)
      .where(eq(reviews.courseId, courseId));

    const rows = await db
      .select({
        authorName: users.name,
        comment: reviews.comment,
        courseId: reviews.courseId,
        createdAt: reviews.createdAt,
        id: reviews.id,
        rating: reviews.rating,
        updatedAt: reviews.updatedAt,
        userId: reviews.userId
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.courseId, courseId))
      .orderBy(desc(reviews.createdAt))
      .limit(params.limit)
      .offset(offset);

    return {
      items: rows,
      total: Number(totalRow?.value ?? 0)
    };
  }

  public async courseIdsReviewedByUser(
    userId: string,
    courseIds: readonly string[]
  ): Promise<ReadonlySet<string>> {
    if (courseIds.length === 0) {
      return new Set();
    }

    const rows = await db
      .select({ courseId: reviews.courseId })
      .from(reviews)
      .where(and(eq(reviews.userId, userId), inArray(reviews.courseId, courseIds)));

    return new Set(rows.map((row) => row.courseId));
  }

  public async findByUserAndCourse(courseId: string, userId: string): Promise<ReviewRecord | null> {
    const [row] = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.courseId, courseId), eq(reviews.userId, userId)))
      .limit(1);

    return row ?? null;
  }

  public async create(input: {
    comment: string | null;
    courseId: string;
    rating: number;
    userId: string;
  }): Promise<ReviewRecord> {
    const [row] = await db
      .insert(reviews)
      .values({
        comment: input.comment,
        courseId: input.courseId,
        rating: input.rating,
        userId: input.userId
      })
      .returning();

    if (!row) {
      throw new Error("Failed to create review");
    }

    return row;
  }

  public async getAggregateForCourse(courseId: string): Promise<{ average: number; count: number }> {
    const [row] = await db
      .select({
        average: sql<number>`coalesce(avg(${reviews.rating})::numeric, 0)`,
        total: sql<number>`count(*)::int`
      })
      .from(reviews)
      .where(eq(reviews.courseId, courseId));

    return {
      average: Number(row?.average ?? 0),
      count: Number(row?.total ?? 0)
    };
  }
}
