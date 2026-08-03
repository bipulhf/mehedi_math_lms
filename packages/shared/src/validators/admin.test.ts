import { describe, expect, test } from "bun:test";

import {
  adminUpdateBugSchema,
  adminUsersQuerySchema,
  bugsQuerySchema,
  createAdminUserSchema,
  createBugReportSchema,
  manageableUserRoleSchema,
  staffRoleSchema,
  updateAdminUserStatusSchema,
  userListStatusSchema
} from "./admin";

describe("staffRoleSchema", () => {
  test("a staff account is never a STUDENT", () => {
    expect(staffRoleSchema.options).toEqual(["TEACHER", "ACCOUNTANT", "ADMIN"]);
    expect(staffRoleSchema.safeParse("STUDENT").success).toBe(false);
  });

  test("ADMIN is creatable — ADR-0002", () => {
    expect(staffRoleSchema.safeParse("ADMIN").success).toBe(true);
  });
});

describe("manageableUserRoleSchema", () => {
  test("covers every role, unlike the staff-creation set", () => {
    expect(manageableUserRoleSchema.options).toEqual([
      "STUDENT",
      "TEACHER",
      "ACCOUNTANT",
      "ADMIN"
    ]);
  });
});

describe("createAdminUserSchema", () => {
  test("accepts a staff account", () => {
    expect(
      createAdminUserSchema.parse({ email: "teacher@example.com", name: "Nadia", role: "TEACHER" })
    ).toMatchObject({ role: "TEACHER" });
  });

  test("accepts a STUDENT account", () => {
    expect(
      createAdminUserSchema.parse({ email: "student@example.com", name: "Rahim", role: "STUDENT" })
    ).toMatchObject({ role: "STUDENT" });
  });

  test("rejects a bad address and an empty name", () => {
    expect(
      createAdminUserSchema.safeParse({ email: "teacher", name: "Nadia", role: "TEACHER" }).success
    ).toBe(false);
    expect(
      createAdminUserSchema.safeParse({ email: "t@example.com", name: "  ", role: "TEACHER" })
        .success
    ).toBe(false);
  });

  test("carries the caller's own password when one is supplied", () => {
    // The requirement that ADMIN creation re-checks the password is enforced in
    // the service; the schema only has to carry the field.
    expect(
      createAdminUserSchema.parse({
        confirmPassword: "hunter2hunter2",
        email: "admin@example.com",
        name: "Tanvir",
        role: "ADMIN"
      }).confirmPassword
    ).toBe("hunter2hunter2");
  });
});

describe("updateAdminUserStatusSchema", () => {
  test("deactivation is a boolean; deletion lives on its own endpoint", () => {
    expect(updateAdminUserStatusSchema.parse({ isActive: false }).isActive).toBe(false);
    expect(updateAdminUserStatusSchema.safeParse({ isActive: "false" }).success).toBe(false);
    expect(updateAdminUserStatusSchema.safeParse({}).success).toBe(false);
  });
});

describe("adminUsersQuerySchema", () => {
  test("lists everyone by default, ten at a time", () => {
    expect(adminUsersQuerySchema.parse({})).toMatchObject({ limit: 10, page: 1, status: "all" });
  });

  test("only the three list statuses are filterable", () => {
    expect(userListStatusSchema.options).toEqual(["all", "active", "inactive"]);
    expect(adminUsersQuerySchema.safeParse({ status: "banned" }).success).toBe(false);
  });

  test("only a real role is filterable", () => {
    expect(adminUsersQuerySchema.safeParse({ role: "TEACHER" }).success).toBe(true);
    expect(adminUsersQuerySchema.safeParse({ role: "MODERATOR" }).success).toBe(false);
  });
});

describe("bug reports", () => {
  test("a report needs a title and a description", () => {
    expect(
      createBugReportSchema.safeParse({ description: "It broke.", title: "Broken" }).success
    ).toBe(true);
    expect(createBugReportSchema.safeParse({ description: "It broke.", title: "" }).success).toBe(
      false
    );
  });

  test("a screenshot url is optional and clearable", () => {
    expect(
      createBugReportSchema.safeParse({ description: "d", screenshotUrl: "", title: "t" }).success
    ).toBe(true);
    expect(
      createBugReportSchema.safeParse({ description: "d", screenshotUrl: "shot.png", title: "t" })
        .success
    ).toBe(false);
  });

  test("triage only accepts the declared statuses and priorities", () => {
    expect(adminUpdateBugSchema.safeParse({ priority: "HIGH", status: "RESOLVED" }).success).toBe(
      true
    );
    expect(adminUpdateBugSchema.safeParse({ status: "WONTFIX" }).success).toBe(false);
    expect(adminUpdateBugSchema.safeParse({ priority: "URGENT" }).success).toBe(false);
    expect(bugsQuerySchema.parse({})).toMatchObject({ limit: 10, page: 1 });
  });
});
