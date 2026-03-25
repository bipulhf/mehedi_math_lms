import { randomBytes, scryptSync } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { accounts, db, users } from "@mma/db";
import { z } from "zod";

const seedEnvSchema = z.object({
  ADMIN_EMAIL: z.email(),
  ADMIN_PASSWORD: z.string().min(8)
});

const seedEnv = seedEnvSchema.parse(process.env);

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");

  return `${salt}:${hash}`;
}

async function seedAdmin(): Promise<void> {
  const passwordHash = hashPassword(seedEnv.ADMIN_PASSWORD);

  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, seedEnv.ADMIN_EMAIL))
    .limit(1);

  let userId = existingUser[0]?.id;

  if (!userId) {
    const insertedUsers = await db
      .insert(users)
      .values({
        email: seedEnv.ADMIN_EMAIL,
        name: "Platform Administrator",
        slug: "platform-administrator",
        role: "ADMIN",
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
    await db
      .update(users)
      .set({
        name: "Platform Administrator",
        slug: "platform-administrator",
        role: "ADMIN",
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

  if (existingAccount[0]?.id) {
    await db
      .update(accounts)
      .set({
        providerAccountId: seedEnv.ADMIN_EMAIL,
        passwordHash,
        updatedAt: new Date()
      })
      .where(eq(accounts.id, existingAccount[0].id));
  } else {
    await db.insert(accounts).values({
      userId,
      providerId: "credential",
      providerAccountId: seedEnv.ADMIN_EMAIL,
      passwordHash
    });
  }
}

await seedAdmin();
