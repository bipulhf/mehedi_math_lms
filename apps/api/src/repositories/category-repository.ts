import { asc, categories, count, courses, db, eq } from "@mma/db";

export interface CategoryRecord {
  createdAt: Date;
  description: string | null;
  icon: string | null;
  id: string;
  isActive: boolean;
  name: string;
  parentId: string | null;
  slug: string;
  sortOrder: number;
  updatedAt: Date;
}

export interface CreateCategoryInput {
  description: string | null;
  icon: string | null;
  isActive: boolean;
  name: string;
  parentId: string | null;
  slug: string;
  sortOrder: number;
}

export interface UpdateCategoryInput extends CreateCategoryInput {}

export interface ReorderCategoryInput {
  id: string;
  parentId: string | null;
  sortOrder: number;
}

export class CategoryRepository {
  public async list(): Promise<readonly CategoryRecord[]> {
    return db
      .select({
        createdAt: categories.createdAt,
        description: categories.description,
        icon: categories.icon,
        id: categories.id,
        isActive: categories.isActive,
        name: categories.name,
        parentId: categories.parentId,
        slug: categories.slug,
        sortOrder: categories.sortOrder,
        updatedAt: categories.updatedAt
      })
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.name));
  }

  public async findById(id: string): Promise<CategoryRecord | null> {
    const rows = await db
      .select({
        createdAt: categories.createdAt,
        description: categories.description,
        icon: categories.icon,
        id: categories.id,
        isActive: categories.isActive,
        name: categories.name,
        parentId: categories.parentId,
        slug: categories.slug,
        sortOrder: categories.sortOrder,
        updatedAt: categories.updatedAt
      })
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    return rows[0] ?? null;
  }

  public async findBySlug(slug: string): Promise<CategoryRecord | null> {
    const rows = await db
      .select({
        createdAt: categories.createdAt,
        description: categories.description,
        icon: categories.icon,
        id: categories.id,
        isActive: categories.isActive,
        name: categories.name,
        parentId: categories.parentId,
        slug: categories.slug,
        sortOrder: categories.sortOrder,
        updatedAt: categories.updatedAt
      })
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);

    return rows[0] ?? null;
  }

  public async create(input: CreateCategoryInput): Promise<CategoryRecord> {
    const rows = await db
      .insert(categories)
      .values({
        description: input.description,
        icon: input.icon,
        isActive: input.isActive,
        name: input.name,
        parentId: input.parentId,
        slug: input.slug,
        sortOrder: input.sortOrder
      })
      .returning({
        createdAt: categories.createdAt,
        description: categories.description,
        icon: categories.icon,
        id: categories.id,
        isActive: categories.isActive,
        name: categories.name,
        parentId: categories.parentId,
        slug: categories.slug,
        sortOrder: categories.sortOrder,
        updatedAt: categories.updatedAt
      });

    const createdCategory = rows[0];

    if (!createdCategory) {
      throw new Error("Failed to create category");
    }

    return createdCategory;
  }

  public async update(id: string, input: UpdateCategoryInput): Promise<CategoryRecord | null> {
    const rows = await db
      .update(categories)
      .set({
        description: input.description,
        icon: input.icon,
        isActive: input.isActive,
        name: input.name,
        parentId: input.parentId,
        slug: input.slug,
        sortOrder: input.sortOrder,
        updatedAt: new Date()
      })
      .where(eq(categories.id, id))
      .returning({
        createdAt: categories.createdAt,
        description: categories.description,
        icon: categories.icon,
        id: categories.id,
        isActive: categories.isActive,
        name: categories.name,
        parentId: categories.parentId,
        slug: categories.slug,
        sortOrder: categories.sortOrder,
        updatedAt: categories.updatedAt
      });

    return rows[0] ?? null;
  }

  public async delete(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  public async countChildren(id: string): Promise<number> {
    const rows = await db
      .select({ value: count() })
      .from(categories)
      .where(eq(categories.parentId, id));

    return rows[0]?.value ?? 0;
  }

  public async countCourses(id: string): Promise<number> {
    const rows = await db
      .select({ value: count() })
      .from(courses)
      .where(eq(courses.categoryId, id));

    return rows[0]?.value ?? 0;
  }

  public async reorder(items: readonly ReorderCategoryInput[]): Promise<void> {
    await db.transaction(async (transaction) => {
      for (const item of items) {
        await transaction
          .update(categories)
          .set({
            parentId: item.parentId,
            sortOrder: item.sortOrder,
            updatedAt: new Date()
          })
          .where(eq(categories.id, item.id));
      }
    });
  }
}
