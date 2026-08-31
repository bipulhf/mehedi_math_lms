import type {
  BasicProfileInput,
  StudentProfileInput,
  TeacherProfileInput,
  UserRole
} from "@mma/shared";
import {
  basicProfileInputSchema,
  studentProfileInputSchema,
  teacherProfileInputSchema
} from "@mma/shared";
import type { ZodType } from "zod";

import type { OwnProfile } from "@/src/lib/api/profiles";

/**
 * The profile form's shape, kept out of the screen so the field list, the
 * schema and the initial values are one thing rather than three that can drift.
 *
 * Every value is a string because that is what a `TextInput` holds; the shared
 * schemas already accept `""` for every optional field, so an untouched form
 * submits cleanly instead of needing to be pruned first.
 */

export interface ProfileField {
  key: string;
  keyboard?: "default" | "email-address" | "numeric" | "phone-pad";
  label: string;
  multiline?: boolean;
  placeholder?: string;
}

export interface ProfileFormShape {
  fields: readonly ProfileField[];
  schema: ZodType;
}

const NAME_FIELD: ProfileField = { key: "name", label: "Full name", placeholder: "Your name" };
const PHONE_FIELD: ProfileField = {
  key: "phone",
  keyboard: "phone-pad",
  label: "Phone",
  placeholder: "01XXXXXXXXX"
};

const STUDENT_FIELDS: readonly ProfileField[] = [
  NAME_FIELD,
  PHONE_FIELD,
  { key: "dateOfBirth", label: "Date of birth", placeholder: "YYYY-MM-DD" },
  { key: "guardianName", label: "Guardian name" },
  { key: "guardianPhone", keyboard: "phone-pad", label: "Guardian phone" },
  { key: "institution", label: "Institution" },
  { key: "classOrGrade", label: "Class or grade" },
  { key: "address", label: "Address", multiline: true }
];

const TEACHER_FIELDS: readonly ProfileField[] = [
  NAME_FIELD,
  PHONE_FIELD,
  { key: "bio", label: "Bio", multiline: true },
  { key: "qualifications", label: "Qualifications", multiline: true },
  { key: "specializations", label: "Specializations", multiline: true },
  { key: "socialLinks", label: "Social links", multiline: true }
];

const BASIC_FIELDS: readonly ProfileField[] = [{ ...NAME_FIELD, label: "Display name" }];

export function profileFormShape(role: UserRole): ProfileFormShape {
  if (role === "STUDENT") {
    return { fields: STUDENT_FIELDS, schema: studentProfileInputSchema };
  }

  if (role === "TEACHER") {
    return { fields: TEACHER_FIELDS, schema: teacherProfileInputSchema };
  }

  // An accountant or admin has a name and nothing role-specific to fill in.
  return { fields: BASIC_FIELDS, schema: basicProfileInputSchema };
}

/**
 * Profile photos are uploaded by the native profile screen through the signed
 * image flow, then sent as `profilePhoto` with the role-specific form payload.
 */
export function profileFormValues(
  profile: OwnProfile | null,
  role: UserRole
): Record<string, string> {
  const { fields } = profileFormShape(role);
  const source: Record<string, unknown> = {
    name: profile?.user.name ?? "",
    ...(profile?.studentProfile ?? {}),
    ...(profile?.teacherProfile ?? {})
  };

  return Object.fromEntries(fields.map((field) => [field.key, String(source[field.key] ?? "")]));
}

export type ProfileInput = BasicProfileInput | StudentProfileInput | TeacherProfileInput;

export interface ProfileFormResult {
  errors: Record<string, string>;
  values: ProfileInput | null;
}

export function validateProfileForm(
  values: Record<string, string>,
  role: UserRole
): ProfileFormResult {
  const result = profileFormShape(role).schema.safeParse(values);

  if (result.success) {
    // The schema was chosen from the same role, so its output is that role's
    // input shape — which the generic `ZodType` above cannot express.
    return { errors: {}, values: result.data as ProfileInput };
  }

  // One message per field, in the order Zod reported them — the first issue on
  // a field is the one the student can act on.
  const errors: Record<string, string> = {};

  for (const issue of result.error.issues) {
    const key = issue.path[0];

    if (typeof key === "string" && errors[key] === undefined) {
      errors[key] = issue.message;
    }
  }

  return { errors, values: null };
}
