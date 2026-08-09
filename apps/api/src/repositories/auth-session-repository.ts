import type { UserRole } from "@mma/shared";
import { db, eq, sessions, users } from "@mma/db";

interface UserAuthStateRecord {
  isActive: boolean;
  role: UserRole;
}

export class AuthSessionRepository {
  public async deleteByUserId(userId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }

  public async findUserAuthState(userId: string): Promise<UserAuthStateRecord | null> {
    const rows = await db
      .select({
        isActive: users.isActive,
        role: users.role
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const authState = rows[0];

    if (!authState) {
      return null;
    }

    return {
      isActive: authState.isActive,
      role: authState.role as UserRole
    };
  }
}
