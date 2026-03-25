import type { AuthSession, AuthUser } from "@mma/auth";
import type { UserRole } from "@mma/shared";

import { AuthSessionRepository } from "@/repositories/auth-session-repository";
import { ForbiddenError, UnauthorizedError } from "@/utils/errors";

export class AuthGuardService {
  public constructor(private readonly authSessionRepository: AuthSessionRepository) {}

  public async requireActiveSession(
    authSession: AuthSession | null,
    authUser: AuthUser | null
  ): Promise<{ session: AuthSession; user: AuthUser }> {
    if (!authSession || !authUser) {
      throw new UnauthorizedError("Authentication required");
    }

    const currentUserState = await this.authSessionRepository.findUserAuthState(authUser.id);

    if (!currentUserState) {
      await this.authSessionRepository.deleteByUserId(authUser.id);
      throw new UnauthorizedError("Authentication required");
    }

    if (authSession.isActive === false || currentUserState.isActive === false) {
      await this.authSessionRepository.deleteByUserId(authUser.id);
      throw new ForbiddenError("Account is deactivated");
    }

    return {
      session: authSession,
      user: authUser
    };
  }

  public async requireRole(
    authSession: AuthSession | null,
    authUser: AuthUser | null,
    roles: readonly UserRole[]
  ): Promise<{ session: AuthSession; user: AuthUser }> {
    const authenticated = await this.requireActiveSession(authSession, authUser);

    if (!roles.includes(authenticated.session.role as UserRole)) {
      throw new ForbiddenError("You do not have permission to access this resource");
    }

    return authenticated;
  }
}
