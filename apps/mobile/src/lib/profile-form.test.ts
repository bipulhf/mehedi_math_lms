import type { OwnProfile } from "@/src/lib/api";
import { profileFormShape, profileFormValues, validateProfileForm } from "@/src/lib/profile-form";

/**
 * The profile form sits on the critical path: the API refuses most actions
 * until it has been submitted once. What is asserted here is that the form
 * matches the role — sending a student's fields under a teacher's schema would
 * be rejected by the server with a message about a field the screen never
 * showed.
 */

const STUDENT_PROFILE: OwnProfile = {
  studentProfile: {
    address: "12 Road 4, Dhaka",
    classOrGrade: "HSC 2",
    dateOfBirth: "2006-04-01",
    guardianName: "A Guardian",
    guardianPhone: "01700000001",
    institution: "Notre Dame College",
    phone: "01700000000",
    profilePhoto: null
  },
  teacherProfile: null,
  user: {
    email: "student@example.com",
    id: "user-1",
    image: null,
    isActive: true,
    name: "A Student",
    profileCompleted: true,
    role: "STUDENT",
    slug: null
  }
};

describe("profileFormShape", () => {
  test("each role gets its own fields", () => {
    const keysFor = (role: Parameters<typeof profileFormShape>[0]): string[] =>
      profileFormShape(role).fields.map((field) => field.key);

    expect(keysFor("STUDENT")).toContain("guardianName");
    expect(keysFor("TEACHER")).toContain("qualifications");
    expect(keysFor("TEACHER")).not.toContain("guardianName");
    // An accountant or admin has a name and nothing role-specific.
    expect(keysFor("ADMIN")).toEqual(["name"]);
  });

  test("photo stays outside text fields and is handled by the upload control", () => {
    expect(profileFormShape("STUDENT").fields.map((field) => field.key)).not.toContain("profilePhoto");
    expect(profileFormShape("TEACHER").fields.map((field) => field.key)).not.toContain("profilePhoto");
    expect(profileFormShape("ADMIN").fields.map((field) => field.key)).toEqual(["name"]);
  });
});

describe("profileFormValues", () => {
  test("fills from the role's block, and never leaves a field undefined", () => {
    const values = profileFormValues(STUDENT_PROFILE, "STUDENT");

    expect(values.name).toBe("A Student");
    expect(values.guardianPhone).toBe("01700000001");
    // A null in the record becomes an empty string: a `TextInput` given
    // undefined switches from controlled to uncontrolled mid-edit.
    expect(values.profilePhoto).toBeUndefined();
    expect(Object.values(values).every((value) => typeof value === "string")).toBe(true);
  });

  test("an empty profile still produces every field", () => {
    const values = profileFormValues(null, "STUDENT");

    expect(Object.keys(values)).toEqual(
      profileFormShape("STUDENT").fields.map((field) => field.key)
    );
    expect(values.name).toBe("");
  });
});

describe("validateProfileForm", () => {
  test("an untouched form submits, because only the name is required", () => {
    const values = { ...profileFormValues(null, "STUDENT"), name: "A Student" };

    expect(validateProfileForm(values, "STUDENT").values).toMatchObject({ name: "A Student" });
  });

  test("a missing name is reported against the name field", () => {
    const result = validateProfileForm(profileFormValues(null, "STUDENT"), "STUDENT");

    expect(result.values).toBeNull();
    expect(result.errors.name).toBeDefined();
  });

  test("the age floor is enforced here rather than only by the server", () => {
    const values = {
      ...profileFormValues(null, "STUDENT"),
      dateOfBirth: "2024-01-01",
      name: "A Student"
    };
    const result = validateProfileForm(values, "STUDENT");

    expect(result.values).toBeNull();
    expect(result.errors.dateOfBirth).toContain("10 years old");
  });

  test("a date that is not a date is refused before it reaches the API", () => {
    const values = {
      ...profileFormValues(null, "STUDENT"),
      dateOfBirth: "yesterday",
      name: "A Student"
    };

    expect(validateProfileForm(values, "STUDENT").errors.dateOfBirth).toBeDefined();
  });
});
