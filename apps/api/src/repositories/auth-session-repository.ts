import { db, eq, sessions } from "@mma/db";

export class AuthSessionRepository {
  public async deleteByUserId(userId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }
}
