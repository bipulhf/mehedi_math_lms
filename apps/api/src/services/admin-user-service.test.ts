import { describe, expect, test } from "bun:test";

import type { AdminUserListRecord, AdminUserRepository } from "@/repositories/admin-user-repository";
import type { AuthSessionRepository } from "@/repositories/auth-session-repository";
import type { StaffAccountService } from "@/services/staff-account-service";
import { AdminUserService } from "@/services/admin-user-service";
import { ForbiddenError } from "@/utils/errors";

/**
 * ADR-0002: the admin role can never be emptied — there would be no way back
 * into the platform without shell access. Deactivation is the standard off-ramp.
 * Hard delete exists (`deleteUser`) but is guarded: it refuses self-deletion,
 * the last admin, and accounts with RESTRICT dependencies.
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

describe("AdminUserService.deleteUser", () => {
  interface DeleteOverrides {
    activeAdmins?: number;
    createdCourses?: number;
    smsBatches?: number;
    targetRole?: string;
  }

  interface DeleteCalls {
    deleted: string[];
    purgedSessions: string[];
  }

  const buildDeleteService = (overrides: DeleteOverrides = {}): {
    calls: DeleteCalls;
    service: AdminUserService;
  } => {
    const calls: DeleteCalls = { deleted: [], purgedSessions: [] };

    const adminUserRepository = {
      countActiveAdmins: async () => overrides.activeAdmins ?? 2,
      countCoursesCreatedByUser: async () => overrides.createdCourses ?? 0,
      countSmsBatchesCreatedByUser: async () => overrides.smsBatches ?? 0,
      deleteUser: async (userId: string) => {
        calls.deleted.push(userId);
      },
      findRoleById: async () => overrides.targetRole ?? "TEACHER"
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
  };

  test("an admin cannot delete their own account", async () => {
    const { calls, service } = buildDeleteService();

    await expect(service.deleteUser("admin-1", "admin-1")).rejects.toBeInstanceOf(ForbiddenError);
    expect(calls.deleted).toHaveLength(0);
  });

  test("the last admin cannot be deleted", async () => {
    const { calls, service } = buildDeleteService({ activeAdmins: 1, targetRole: "ADMIN" });

    await expect(service.deleteUser("admin-2", "admin-1")).rejects.toBeInstanceOf(ForbiddenError);
    expect(calls.deleted).toHaveLength(0);
  });

  test("a user who created a course cannot be deleted", async () => {
    const { calls, service } = buildDeleteService({ createdCourses: 2 });

    await expect(
      service.deleteUser("teacher-1", "admin-1")
    ).rejects.toThrow(/created 2 course\(s\)/);
    expect(calls.deleted).toHaveLength(0);
  });

  test("a user who queued an sms broadcast cannot be deleted", async () => {
    const { calls, service } = buildDeleteService({ smsBatches: 1 });

    await expect(
      service.deleteUser("teacher-1", "admin-1")
    ).rejects.toThrow(/SMS broadcast/);
    expect(calls.deleted).toHaveLength(0);
  });

  test("a user with no restrict dependencies is deleted and their sessions purged", async () => {
    const { calls, service } = buildDeleteService({ targetRole: "TEACHER" });

    await service.deleteUser("teacher-1", "admin-1");

    expect(calls.purgedSessions).toEqual(["teacher-1"]);
    expect(calls.deleted).toEqual(["teacher-1"]);
  });
});
