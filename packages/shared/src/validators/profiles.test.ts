import { describe, expect, test } from "bun:test";

import {
  basicProfileInputSchema,
  profileIdParamsSchema,
  studentProfileInputSchema,
  teacherProfileInputSchema
} from "./profiles";

const UUID = "11111111-1111-4111-8111-111111111111";

function yearsAgo(years: number): string {
  const date = new Date();

  date.setFullYear(date.getFullYear() - years);

  return date.toISOString().slice(0, 10);
}

describe("studentProfileInputSchema", () => {
  test("a name is the only required field", () => {
    expect(studentProfileInputSchema.parse({ name: "Ayesha" }).name).toBe("Ayesha");
    expect(studentProfileInputSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(studentProfileInputSchema.safeParse({}).success).toBe(false);
  });

  test("optional text fields accept an empty string, which is how a form clears them", () => {
    expect(
      studentProfileInputSchema.safeParse({
        address: "",
        classOrGrade: "",
        guardianName: "",
        guardianPhone: "",
        institution: "",
        name: "Ayesha",
        phone: "",
        profilePhoto: ""
      }).success
    ).toBe(true);
  });

  test("holds the ten-year age floor", () => {
    expect(
      studentProfileInputSchema.safeParse({ dateOfBirth: yearsAgo(11), name: "Ayesha" }).success
    ).toBe(true);
    expect(
      studentProfileInputSchema.safeParse({ dateOfBirth: yearsAgo(5), name: "Ayesha" }).success
    ).toBe(false);
  });

  test("rejects a date that is not a date", () => {
    expect(
      studentProfileInputSchema.safeParse({ dateOfBirth: "yesterday", name: "Ayesha" }).success
    ).toBe(false);
  });

  test("a profile photo must be a url when it is set", () => {
    expect(
      studentProfileInputSchema.safeParse({ name: "Ayesha", profilePhoto: "photo.png" }).success
    ).toBe(false);
  });
});

describe("teacherProfileInputSchema", () => {
  test("long-form fields stop at 4000 characters", () => {
    expect(
      teacherProfileInputSchema.safeParse({ bio: "a".repeat(4000), name: "Mehedi" }).success
    ).toBe(true);
    expect(
      teacherProfileInputSchema.safeParse({ bio: "a".repeat(4001), name: "Mehedi" }).success
    ).toBe(false);
  });
});

describe("basicProfileInputSchema", () => {
  test("carries the name and photo only — staff have no extended profile", () => {
    expect(Object.keys(basicProfileInputSchema.shape).sort()).toEqual([
      "isComplete",
      "name",
      "profilePhoto"
    ]);
  });
});

describe("the completion flag", () => {
  test("is optional, so an ordinary profile edit says nothing about it", () => {
    // Absent means "this finishes onboarding" — the behaviour every caller had
    // before the setup wizard started saving each step.
    expect(basicProfileInputSchema.parse({ name: "Mehedi" }).isComplete).toBeUndefined();
    expect(
      teacherProfileInputSchema.parse({ name: "Mehedi" }).isComplete
    ).toBeUndefined();
  });

  test("carries false through, which is what keeps a half-filled wizard open", () => {
    expect(studentProfileInputSchema.parse({ isComplete: false, name: "Mehedi" }).isComplete).toBe(
      false
    );
    expect(teacherProfileInputSchema.parse({ isComplete: true, name: "Mehedi" }).isComplete).toBe(
      true
    );
  });

  test("rejects a non-boolean rather than coercing one", () => {
    expect(teacherProfileInputSchema.safeParse({ isComplete: "false", name: "M" }).success).toBe(
      false
    );
  });
});

describe("profileIdParamsSchema", () => {
  test("guards the path parameter", () => {
    expect(profileIdParamsSchema.parse({ id: UUID }).id).toBe(UUID);
    expect(profileIdParamsSchema.safeParse({ id: "me" }).success).toBe(false);
  });
});
