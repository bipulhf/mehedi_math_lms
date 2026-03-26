import { db, eq, isNull, or, users } from "@mma/db";

import { generateUniqueSlug } from "./slug";

interface UserRow {
  id: string;
  name: string;
  slug: string | null;
}

async function findUsersMissingSlugs(): Promise<readonly UserRow[]> {
  return db
    .select({
      id: users.id,
      name: users.name,
      slug: users.slug
    })
    .from(users)
    .where(or(isNull(users.slug), eq(users.slug, "")));
}

async function findUserBySlug(slug: string): Promise<{ id: string } | null> {
  const rows = await db.select({ id: users.id }).from(users).where(eq(users.slug, slug)).limit(1);

  return rows[0] ?? null;
}

async function createUniqueUserSlug(name: string, excludeUserId: string): Promise<string> {
  return generateUniqueSlug(name, async (candidate) => {
    const existingUser = await findUserBySlug(candidate);

    return existingUser !== null && existingUser.id !== excludeUserId;
  });
}

async function backfillUserSlugs(): Promise<void> {
  const usersMissingSlugs = await findUsersMissingSlugs();

  if (usersMissingSlugs.length === 0) {
    console.log("No users require slug backfill.");
    return;
  }

  console.log(`Backfilling slugs for ${usersMissingSlugs.length} users...`);

  for (const user of usersMissingSlugs) {
    const slug = await createUniqueUserSlug(user.name, user.id);

    await db
      .update(users)
      .set({
        slug,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));

    console.log(`Updated ${user.id} -> ${slug}`);
  }

  console.log("User slug backfill completed.");
}

await backfillUserSlugs();
