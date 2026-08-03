import { accounts, db, eq, users } from "@genex/db";

/**
 * Roles an Admin can create on someone's behalf. ADMIN is included so a second
 * administrator can be minted from the UI rather than only by re-running the
 * seed with shell access. Creating one demands re-authentication. ADR-0002.
 */
export type StaffRole = "TEACHER" | "ACCOUNTANT" | "ADMIN";

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
  /** The caller's own credential hash, for the re-auth gate. ADR-0002. */
  public async findPasswordHashByUserId(userId: string): Promise<string | null> {
    const rows = await db
      .select({ password: accounts.password })
      .from(accounts)
      .where(eq(accounts.userId, userId))
      .limit(1);

    return rows[0]?.password ?? null;
  }

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
