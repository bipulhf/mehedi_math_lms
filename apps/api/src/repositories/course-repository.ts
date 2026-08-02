import {
  and,
  asc,
  categories,
  chapters,
  count,
  courseTeachers,
  courses,
  db,
  desc,
  eq,
  ilike,
  inArray,
  lectures,
  or,
  sql,
  teacherProfiles,
  users,
  type SQL
} from "@mma/db";
import type { CourseTeacherRole, UserRole } from "@mma/shared";

/** A teacher and the authority they hold over one course. ADR-0006. */
export interface CourseTeacherAssignment {
  role: CourseTeacherRole;
  teacherId: string;
}

export interface CourseTeacherRecord {
  email: string;
  id: string;
  name: string;
  profilePhoto: string | null;
  /** Authority over the course, not job title. ADR-0006. */
  role: CourseTeacherRole;
  slug: string | null;
}

export interface CourseRecord {
  category: {
    id: string;
    name: string;
    slug: string;
  };
  coverImageUrl: string | null;
  createdAt: Date;
  creator: {
    email: string;
    id: string;
    name: string;
    role: UserRole;
    slug: string | null;
  };
  description: string;
  id: string;
  isExamOnly: boolean;
  price: string;
  publishedAt: Date | null;
  rejectedAt: Date | null;
  reviewFeedback: string | null;
  slug: string;
  status: "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED";
  submittedAt: Date | null;
  teachers: readonly CourseTeacherRecord[];
  title: string;
  updatedAt: Date;
}

export interface CourseListQuery {
  categoryId?: string | undefined;
  limit: number;
  maxPrice?: number | undefined;
  minPrice?: number | undefined;
  page: number;
  search?: string | undefined;
  status?: "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED" | undefined;
}

export interface CreateCourseInput {
  categoryId: string;
  coverImageUrl: string | null;
  creatorId: string;
  description: string;
  isExamOnly: boolean;
  /** Seeded as the course's first OWNER. Null for admin-created courses. */
  ownerTeacherId: string | null;
  price: string;
  reviewFeedback: string | null;
  slug: string;
  title: string;
}

export interface UpdateCourseInput {
  categoryId?: string | undefined;
  coverImageUrl?: string | null | undefined;
  description?: string | undefined;
  isExamOnly?: boolean | undefined;
  price?: string | undefined;
  publishedAt?: Date | null | undefined;
  rejectedAt?: Date | null | undefined;
  reviewFeedback?: string | null | undefined;
  slug?: string | undefined;
  status?: "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED" | undefined;
  submittedAt?: Date | null | undefined;
  title?: string | undefined;
}

/**
 * A teacher in the platform-wide picker. Deliberately not a CourseTeacherRecord:
 * authority is per-course, and this list is not scoped to one. ADR-0006.
 */
export interface TeacherDirectoryRecord {
  bio: string | null;
  email: string;
  id: string;
  name: string;
  profilePhoto: string | null;
  slug: string | null;
}

export class CourseRepository {
  private buildWhereClause(query: CourseListQuery, extraClauses: readonly SQL[]): SQL | undefined {
    const clauses: SQL[] = [...extraClauses];

    if (query.categoryId) {
      clauses.push(eq(courses.categoryId, query.categoryId));
    }

    if (query.status) {
      clauses.push(eq(courses.status, query.status));
    }

    if (query.search) {
      clauses.push(ilike(courses.title, `%${query.search}%`));
    }

    if (query.minPrice !== undefined) {
      clauses.push(sql`${courses.price}::numeric >= ${String(query.minPrice)}::numeric`);
    }

    if (query.maxPrice !== undefined) {
      clauses.push(sql`${courses.price}::numeric <= ${String(query.maxPrice)}::numeric`);
    }

    if (clauses.length === 0) {
      return undefined;
    }

    return clauses.length === 1 ? clauses[0] : and(...clauses);
  }

  private async getTeachersByCourseIds(courseIds: readonly string[]): Promise<Map<string, readonly CourseTeacherRecord[]>> {
    if (courseIds.length === 0) {
      return new Map();
    }

    const rows = await db
      .select({
        courseId: courseTeachers.courseId,
        email: users.email,
        id: users.id,
        name: users.name,
        profilePhoto: teacherProfiles.profilePhoto,
        role: courseTeachers.role,
        slug: users.slug
      })
      .from(courseTeachers)
      .innerJoin(users, eq(courseTeachers.teacherId, users.id))
      .leftJoin(teacherProfiles, eq(teacherProfiles.userId, users.id))
      .where(inArray(courseTeachers.courseId, [...courseIds]))
      .orderBy(asc(users.name));

    const teachersByCourseId = new Map<string, CourseTeacherRecord[]>();

    for (const row of rows) {
      const currentTeachers = teachersByCourseId.get(row.courseId) ?? [];
      currentTeachers.push({
        email: row.email,
        id: row.id,
        name: row.name,
        profilePhoto: row.profilePhoto,
        role: row.role,
        slug: row.slug
      });
      teachersByCourseId.set(row.courseId, currentTeachers);
    }

    return new Map(
      Array.from(teachersByCourseId.entries()).map(([courseId, teachers]) => [courseId, teachers as readonly CourseTeacherRecord[]])
    );
  }

  private mapCourse(
    row: {
      categoryId: string;
      categoryName: string;
      categorySlug: string;
      coverImageUrl: string | null;
      createdAt: Date;
      creatorEmail: string;
      creatorId: string;
      creatorName: string;
      creatorRole: UserRole;
      creatorSlug: string | null;
      description: string;
      id: string;
      isExamOnly: boolean;
      price: string;
      publishedAt: Date | null;
      rejectedAt: Date | null;
      reviewFeedback: string | null;
      slug: string;
      status: "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED";
      submittedAt: Date | null;
      title: string;
      updatedAt: Date;
    },
    teachers: readonly CourseTeacherRecord[]
  ): CourseRecord {
    return {
      category: {
        id: row.categoryId,
        name: row.categoryName,
        slug: row.categorySlug
      },
      coverImageUrl: row.coverImageUrl,
      createdAt: row.createdAt,
      creator: {
        email: row.creatorEmail,
        id: row.creatorId,
        name: row.creatorName,
        role: row.creatorRole,
        slug: row.creatorSlug
      },
      description: row.description,
      id: row.id,
      isExamOnly: row.isExamOnly,
      price: row.price,
      publishedAt: row.publishedAt,
      rejectedAt: row.rejectedAt,
      reviewFeedback: row.reviewFeedback,
      slug: row.slug,
      status: row.status,
      submittedAt: row.submittedAt,
      teachers,
      title: row.title,
      updatedAt: row.updatedAt
    };
  }

  public async findById(id: string): Promise<CourseRecord | null> {
    const rows = await db
      .select({
        categoryId: courses.categoryId,
        categoryName: categories.name,
        categorySlug: categories.slug,
        coverImageUrl: courses.coverImageUrl,
        createdAt: courses.createdAt,
        creatorEmail: users.email,
        creatorId: users.id,
        creatorName: users.name,
        creatorRole: users.role,
        creatorSlug: users.slug,
        description: courses.description,
        id: courses.id,
        isExamOnly: courses.isExamOnly,
        price: courses.price,
        publishedAt: courses.publishedAt,
        rejectedAt: courses.rejectedAt,
        reviewFeedback: courses.reviewFeedback,
        slug: courses.slug,
        status: courses.status,
        submittedAt: courses.submittedAt,
        title: courses.title,
        updatedAt: courses.updatedAt
      })
      .from(courses)
      .innerJoin(categories, eq(courses.categoryId, categories.id))
      .innerJoin(users, eq(courses.creatorId, users.id))
      .where(eq(courses.id, id))
      .limit(1);

    const course = rows[0];

    if (!course) {
      return null;
    }

    const teachersByCourseId = await this.getTeachersByCourseIds([course.id]);

    return this.mapCourse(course, teachersByCourseId.get(course.id) ?? []);
  }

  public async findBySlug(slug: string): Promise<CourseRecord | null> {
    const rows = await db.select({ id: courses.id }).from(courses).where(eq(courses.slug, slug)).limit(1);
    const match = rows[0];

    if (!match) {
      return null;
    }

    return this.findById(match.id);
  }

  public async listCourses(
    query: CourseListQuery,
    extraClauses: readonly SQL[] = []
  ): Promise<{ items: readonly CourseRecord[]; total: number }> {
    const whereClause = this.buildWhereClause(query, extraClauses);
    const limit = query.limit;
    const offset = (query.page - 1) * query.limit;

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          categoryId: courses.categoryId,
          categoryName: categories.name,
          categorySlug: categories.slug,
          coverImageUrl: courses.coverImageUrl,
          createdAt: courses.createdAt,
          creatorEmail: users.email,
          creatorId: users.id,
          creatorName: users.name,
          creatorRole: users.role,
          creatorSlug: users.slug,
          description: courses.description,
          id: courses.id,
          isExamOnly: courses.isExamOnly,
          price: courses.price,
          publishedAt: courses.publishedAt,
          rejectedAt: courses.rejectedAt,
          reviewFeedback: courses.reviewFeedback,
          slug: courses.slug,
          status: courses.status,
          submittedAt: courses.submittedAt,
          title: courses.title,
          updatedAt: courses.updatedAt
        })
        .from(courses)
        .innerJoin(categories, eq(courses.categoryId, categories.id))
        .innerJoin(users, eq(courses.creatorId, users.id))
        .where(whereClause)
        .orderBy(desc(courses.updatedAt), desc(courses.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(courses).where(whereClause)
    ]);

    const teachersByCourseId = await this.getTeachersByCourseIds(rows.map((row) => row.id));

    return {
      items: rows.map((row) => this.mapCourse(row, teachersByCourseId.get(row.id) ?? [])),
      total: totalRows[0]?.value ?? 0
    };
  }

  public async create(input: CreateCourseInput): Promise<CourseRecord> {
    const rows = await db
      .insert(courses)
      .values({
        categoryId: input.categoryId,
        coverImageUrl: input.coverImageUrl,
        creatorId: input.creatorId,
        description: input.description,
        isExamOnly: input.isExamOnly,
        price: input.price,
        reviewFeedback: input.reviewFeedback,
        slug: input.slug,
        title: input.title
      })
      .returning({ id: courses.id });

    const createdCourse = rows[0];

    if (!createdCourse) {
      throw new Error("Failed to create course");
    }

    // A teacher who creates a course owns it from the outset, so it is never
    // ownerless. An admin-created course has no owner until one is assigned —
    // admins bypass the ownership guard anyway. ADR-0006.
    if (input.ownerTeacherId) {
      await db.insert(courseTeachers).values({
        courseId: createdCourse.id,
        role: "OWNER",
        teacherId: input.ownerTeacherId
      });
    }

    const course = await this.findById(createdCourse.id);

    if (!course) {
      throw new Error("Failed to fetch created course");
    }

    return course;
  }

  public async update(id: string, input: UpdateCourseInput): Promise<CourseRecord | null> {
    const values: UpdateCourseInput & { updatedAt: Date } = {
      updatedAt: new Date()
    };

    if (input.categoryId !== undefined) {
      values.categoryId = input.categoryId;
    }

    if (input.coverImageUrl !== undefined) {
      values.coverImageUrl = input.coverImageUrl;
    }

    if (input.description !== undefined) {
      values.description = input.description;
    }

    if (input.isExamOnly !== undefined) {
      values.isExamOnly = input.isExamOnly;
    }

    if (input.price !== undefined) {
      values.price = input.price;
    }

    if (input.publishedAt !== undefined) {
      values.publishedAt = input.publishedAt;
    }

    if (input.rejectedAt !== undefined) {
      values.rejectedAt = input.rejectedAt;
    }

    if (input.reviewFeedback !== undefined) {
      values.reviewFeedback = input.reviewFeedback;
    }

    if (input.slug !== undefined) {
      values.slug = input.slug;
    }

    if (input.status !== undefined) {
      values.status = input.status;
    }

    if (input.submittedAt !== undefined) {
      values.submittedAt = input.submittedAt;
    }

    if (input.title !== undefined) {
      values.title = input.title;
    }

    const rows = await db.update(courses).set(values).where(eq(courses.id, id)).returning({ id: courses.id });
    const updatedCourse = rows[0];

    if (!updatedCourse) {
      return null;
    }

    return this.findById(updatedCourse.id);
  }

  /**
   * Replaces the roster wholesale, carrying each teacher's authority with them.
   * Roles must be supplied explicitly — this used to delete and re-insert, which
   * would silently demote every owner. ADR-0006.
   */
  /** How many lectures a course holds, across all its chapters. */
  public async countLecturesByCourseId(courseId: string): Promise<number> {
    const [row] = await db
      .select({ value: sql<number>`count(*)` })
      .from(lectures)
      .innerJoin(chapters, eq(chapters.id, lectures.chapterId))
      .where(eq(chapters.courseId, courseId));

    return Number(row?.value ?? 0);
  }

  public async replaceTeachers(
    courseId: string,
    entries: readonly CourseTeacherAssignment[]
  ): Promise<readonly CourseTeacherRecord[]> {
    const uniqueEntries = [...new Map(entries.map((entry) => [entry.teacherId, entry])).values()];

    await db.transaction(async (transaction) => {
      await transaction.delete(courseTeachers).where(eq(courseTeachers.courseId, courseId));

      if (uniqueEntries.length > 0) {
        await transaction.insert(courseTeachers).values(
          uniqueEntries.map((entry) => ({
            courseId,
            role: entry.role,
            teacherId: entry.teacherId
          }))
        );
      }
    });

    const teachersByCourseId = await this.getTeachersByCourseIds([courseId]);

    return teachersByCourseId.get(courseId) ?? [];
  }

  public async getAssignedCourseIds(teacherId: string): Promise<readonly string[]> {
    const rows = await db
      .select({ courseId: courseTeachers.courseId })
      .from(courseTeachers)
      .where(eq(courseTeachers.teacherId, teacherId));

    return rows.map((row) => row.courseId);
  }

  public async listTeacherDirectory(search?: string | undefined): Promise<readonly TeacherDirectoryRecord[]> {
    const whereClause =
      search && search.trim().length > 0
        ? and(eq(users.role, "TEACHER"), eq(users.isActive, true), or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`)))
        : and(eq(users.role, "TEACHER"), eq(users.isActive, true));

    const rows = await db
      .select({
        bio: teacherProfiles.bio,
        email: users.email,
        id: users.id,
        name: users.name,
        profilePhoto: teacherProfiles.profilePhoto,
        slug: users.slug
      })
      .from(users)
      .leftJoin(teacherProfiles, eq(teacherProfiles.userId, users.id))
      .where(whereClause)
      .orderBy(asc(users.name));

    return rows;
  }

  public async countTeachersByIds(teacherIds: readonly string[]): Promise<number> {
    if (teacherIds.length === 0) {
      return 0;
    }

    const rows = await db
      .select({ value: count() })
      .from(users)
      .where(and(inArray(users.id, [...new Set(teacherIds)]), eq(users.role, "TEACHER"), eq(users.isActive, true)));

    return rows[0]?.value ?? 0;
  }
}
