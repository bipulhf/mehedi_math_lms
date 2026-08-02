import { describe, expect, test } from "bun:test";

import { createPasswordHash } from "@mma/auth/server";

import type { StaffAccountRepository } from "@/repositories/staff-account-repository";
import { StaffAccountService } from "@/services/staff-account-service";
import { ConflictError, ForbiddenError, ValidationError } from "@/utils/errors";

/**
 * ADR-0002: an admin may create another admin, but only by re-entering their
 * own password. A hijacked session must not be enough to mint a second,
 * persistent administrator. ADR-0003: no invite is enqueued.
 */

interface Overrides {
  emailTaken?: boolean;
  passwordHash?: string | null;
}

const callerPassword = "correct-horse-battery";
const callerPasswordHash = await createPasswordHash(callerPassword);

function buildService(overrides: Overrides = {}): StaffAccountService {
  const staffAccountRepository = {
    create: async (input: { email: string; name: string; role: string; slug: string }) => ({
      email: input.email,
      id: "user-new",
      isActive: true,
      name: input.name,
      profileCompleted: false,
      role: input.role,
      slug: input.slug
    }),
    findByEmail: async () => (overrides.emailTaken ? { id: "existing" } : null),
    findBySlug: async () => null,
    findPasswordHashByUserId: async () =>
      overrides.passwordHash === undefined ? callerPasswordHash : overrides.passwordHash
  } as unknown as StaffAccountRepository;

  return new StaffAccountService(staffAccountRepository);
}

describe("StaffAccountService.createStaffAccount", () => {
  test("a teacher account needs no password confirmation", async () => {
    const service = buildService();
    const created = await service.createStaffAccount(
      { email: "t@example.com", name: "Teacher", role: "TEACHER" },
      "admin-1"
    );

    expect(created.role).toBe("TEACHER");
    expect(created.temporaryPassword).toHaveLength(16);
  });

  test("an accountant account needs no password confirmation", async () => {
    const service = buildService();
    const created = await service.createStaffAccount(
      { email: "a@example.com", name: "Accountant", role: "ACCOUNTANT" },
      "admin-1"
    );

    expect(created.role).toBe("ACCOUNTANT");
  });

  test("creating an admin without confirming a password is refused", async () => {
    const service = buildService();

    await expect(
      service.createStaffAccount({ email: "a@example.com", name: "Admin", role: "ADMIN" }, "admin-1")
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test("creating an admin with the wrong password is refused", async () => {
    const service = buildService();

    await expect(
      service.createStaffAccount(
        {
          confirmPassword: "wrong",
          email: "a@example.com",
          name: "Admin",
          role: "ADMIN"
        },
        "admin-1"
      )
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  test("a caller with no stored password cannot create an admin", async () => {
    // An OAuth-only account has no credential to confirm against.
    const service = buildService({ passwordHash: null });

    await expect(
      service.createStaffAccount(
        {
          confirmPassword: "anything",
          email: "a@example.com",
          name: "Admin",
          role: "ADMIN"
        },
        "admin-1"
      )
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  test("creating an admin with the correct password succeeds", async () => {
    const service = buildService();
    const created = await service.createStaffAccount(
      {
        confirmPassword: callerPassword,
        email: "a@example.com",
        name: "Admin",
        role: "ADMIN"
      },
      "admin-1"
    );

    expect(created.role).toBe("ADMIN");
  });

  test("a corrupt stored hash fails closed rather than throwing", async () => {
    const service = buildService({ passwordHash: "not-a-real-hash" });

    await expect(
      service.createStaffAccount(
        {
          confirmPassword: callerPassword,
          email: "a@example.com",
          name: "Admin",
          role: "ADMIN"
        },
        "admin-1"
      )
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  test("a duplicate email is refused", async () => {
    const service = buildService({ emailTaken: true });

    await expect(
      service.createStaffAccount(
        { email: "taken@example.com", name: "Teacher", role: "TEACHER" },
        "admin-1"
      )
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
