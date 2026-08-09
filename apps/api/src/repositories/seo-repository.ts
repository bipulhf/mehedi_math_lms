import { and, categories, courses, db, eq, isNotNull, users } from "@mma/db";

export interface SitemapCourseRow {
  slug: string;
  updatedAt: Date;
}

export interface SitemapCategoryRow {
  slug: string;
  updatedAt: Date;
}

export interface SitemapTeacherRow {
  slug: string;
  updatedAt: Date;
}

export class SeoRepository {
  public async listPublishedCoursesForSitemap(): Promise<readonly SitemapCourseRow[]> {
    return db
      .select({
        slug: courses.slug,
        updatedAt: courses.updatedAt
      })
      .from(courses)
      .where(eq(courses.status, "PUBLISHED"));
  }

  public async listActiveCategoriesForSitemap(): Promise<readonly SitemapCategoryRow[]> {
    return db
      .select({
        slug: categories.slug,
        updatedAt: categories.updatedAt
      })
      .from(categories)
      .where(eq(categories.isActive, true));
  }

  public async listTeachersForSitemap(): Promise<readonly SitemapTeacherRow[]> {
    const rows = await db
      .select({
        slug: users.slug,
        updatedAt: users.updatedAt
      })
      .from(users)
      .where(
        and(
          eq(users.role, "TEACHER"),
          eq(users.isActive, true),
          eq(users.banned, false),
          isNotNull(users.slug)
        )
      );

    const out: SitemapTeacherRow[] = [];

    for (const row of rows) {
      if (row.slug !== null && row.slug.length > 0) {
        out.push({ slug: row.slug, updatedAt: row.updatedAt });
      }
    }

    return out;
  }
}
