import { accounts, db, eq, users } from "@mma/db";

export type StaffRole = "TEACHER" | "ACCOUNTANT";

export interface CreateStaffAccountInput {
  email: string;
  name: string;
  passwordHash: string;
  role: StaffRole;
  slug: string;
}

export interface StaffAccountRecord {
  email: string;
  id: string;
  isActive: boolean;
  name: string;
  profileCompleted: boolean;
  role: StaffRole;
  slug: string | null;
}

export class StaffAccountRepository {
  public async findByEmail(email: string): Promise<Pick<StaffAccountRecord, "id"> | null> {
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return existingUser[0] ?? null;
  }

  public async findBySlug(slug: string): Promise<Pick<StaffAccountRecord, "id"> | null> {
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.slug, slug))
      .limit(1);

    return existingUser[0] ?? null;
  }

  public async create(input: CreateStaffAccountInput): Promise<StaffAccountRecord> {
    return db.transaction(async (transaction) => {
      const insertedUsers = await transaction
        .insert(users)
        .values({
          email: input.email,
          name: input.name,
          slug: input.slug,
          role: input.role,
          profileCompleted: false,
          isActive: true,
          emailVerified: false
        })
        .returning({
          email: users.email,
          id: users.id,
          isActive: users.isActive,
          name: users.name,
          profileCompleted: users.profileCompleted,
          role: users.role,
          slug: users.slug
        });

      const insertedUser = insertedUsers[0];

      if (!insertedUser) {
        throw new Error("Failed to create staff account");
      }

      await transaction.insert(accounts).values({
        userId: insertedUser.id,
        providerId: "credential",
        accountId: insertedUser.id,
        password: input.passwordHash
      });

      return {
        ...insertedUser,
        role: insertedUser.role as StaffRole
      };
    });
  }
}
