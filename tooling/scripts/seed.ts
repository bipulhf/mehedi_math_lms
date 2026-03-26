import { createPasswordHash } from "@mma/auth/server";
import { accounts, and, db, eq, sql, users } from "@mma/db";
import { generateUniqueSlug } from "./slug";
import { z } from "zod";

const seedEnvSchema = z.object({
  ADMIN_EMAIL: z.email(),
  ADMIN_PASSWORD: z.string().min(8)
});

const seedEnv = seedEnvSchema.parse(process.env);

async function createUniqueUserSlug(name: string, excludeUserId?: string): Promise<string> {
  return generateUniqueSlug(name, async (candidate) => {
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.slug, candidate))
      .limit(1);

    return existingUser[0] !== undefined && existingUser[0].id !== excludeUserId;
  });
}

async function seedAdmin(): Promise<void> {
  const check = await db.execute(sql`select to_regclass('public.users') as t`);
  const exists = check.rows?.[0]?.t ?? null;
  if (!exists) {
    throw new Error(
      "Schema not migrated: public.users does not exist. Run bun run db:migrate first (same DATABASE_URL)."
    );
  }

  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, seedEnv.ADMIN_EMAIL))
    .limit(1);

  let userId = existingUser[0]?.id;

  if (!userId) {
    const slug = await createUniqueUserSlug("Platform Administrator");

    const insertedUsers = await db
      .insert(users)
      .values({
        email: seedEnv.ADMIN_EMAIL,
        name: "Platform Administrator",
        slug,
        role: "ADMIN",
        banned: false,
        emailVerified: true,
        profileCompleted: true,
        isActive: true
      })
      .returning({ id: users.id });

    const insertedUser = insertedUsers[0];

    if (!insertedUser) {
      throw new Error("Failed to create admin user");
    }

    userId = insertedUser.id;
  }

  if (existingUser[0]?.id) {
    const slug = await createUniqueUserSlug("Platform Administrator", userId);

    await db
      .update(users)
      .set({
        name: "Platform Administrator",
        slug,
        role: "ADMIN",
        banned: false,
        banReason: null,
        banExpires: null,
        emailVerified: true,
        profileCompleted: true,
        isActive: true,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  const existingAccount = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.providerId, "credential")))
    .limit(1);

  const passwordHash = await createPasswordHash(seedEnv.ADMIN_PASSWORD);

  if (existingAccount[0]?.id) {
    await db
      .update(accounts)
      .set({
        accountId: userId,
        password: passwordHash,
        updatedAt: new Date()
      })
      .where(eq(accounts.id, existingAccount[0].id));
  } else {
    await db.insert(accounts).values({
      userId,
      providerId: "credential",
      accountId: userId,
      password: passwordHash
    });
  }
}

await seedAdmin();
