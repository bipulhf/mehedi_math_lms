import { describe, expect, test } from "bun:test";

import type { AdminUserListRecord, AdminUserRepository } from "@/repositories/admin-user-repository";
import type { AuthSessionRepository } from "@/repositories/auth-session-repository";
import type { StaffAccountService } from "@/services/staff-account-service";
import { AdminUserService } from "@/services/admin-user-service";
import { ForbiddenError } from "@/utils/errors";

/**
 * ADR-0002: the admin role can never be emptied — there would be no way back
 * into the platform without shell access. ADR-0003: deactivation is the only
 * terminal state; there is no delete.
 */

interface Overrides {
  activeAdmins?: number;
  targetRole?: string;
}

interface Calls {
  purgedSessions: string[];
  statusWrites: { isActive: boolean; userId: string }[];
}

function buildService(overrides: Overrides = {}): { calls: Calls; service: AdminUserService } {
  const calls: Calls = { purgedSessions: [], statusWrites: [] };

  const adminUserRepository = {
    countActiveAdmins: async () => overrides.activeAdmins ?? 2,
    findRoleById: async () => overrides.targetRole ?? "STUDENT",
    updateUserStatus: async (userId: string, isActive: boolean) => {
      calls.statusWrites.push({ isActive, userId });

      return { id: userId, isActive } as unknown as AdminUserListRecord;
    }
  } as unknown as AdminUserRepository;

  const authSessionRepository = {
    deleteByUserId: async (userId: string) => {
      calls.purgedSessions.push(userId);
    }
  } as unknown as AuthSessionRepository;

  return {
    calls,
    service: new AdminUserService(
      adminUserRepository,
      authSessionRepository,
      {} as unknown as StaffAccountService
    )
  };
}

describe("AdminUserService.updateUserStatus", () => {
  test("an admin cannot deactivate themselves", async () => {
    const { service } = buildService();

    await expect(
      service.updateUserStatus("admin-1", "admin-1", false)
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  test("the last active admin cannot be deactivated", async () => {
    const { calls, service } = buildService({ activeAdmins: 1, targetRole: "ADMIN" });

    await expect(
      service.updateUserStatus("admin-2", "admin-1", false)
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(calls.statusWrites).toHaveLength(0);
  });

  test("an admin can be deactivated while another remains", async () => {
    const { calls, service } = buildService({ activeAdmins: 2, targetRole: "ADMIN" });

    await service.updateUserStatus("admin-2", "admin-1", false);

    expect(calls.statusWrites).toEqual([{ isActive: false, userId: "admin-2" }]);
    expect(calls.purgedSessions).toEqual(["admin-2"]);
  });

  test("the last-admin guard does not block deactivating a student", async () => {
    const { calls, service } = buildService({ activeAdmins: 1, targetRole: "STUDENT" });

    await service.updateUserStatus("student-1", "admin-1", false);

    expect(calls.statusWrites).toEqual([{ isActive: false, userId: "student-1" }]);
  });

  test("reactivating is never blocked by the last-admin guard", async () => {
    const { calls, service } = buildService({ activeAdmins: 1, targetRole: "ADMIN" });

    await service.updateUserStatus("admin-2", "admin-1", true);

    expect(calls.statusWrites).toEqual([{ isActive: true, userId: "admin-2" }]);
  });
});
