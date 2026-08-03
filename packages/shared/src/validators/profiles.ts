import { z } from "zod";

const idSchema = z.string().uuid();
const nonEmptyStringSchema = z.string().trim().min(1);
const optionalShortTextSchema = z.string().trim().max(255).optional().or(z.literal(""));
const optionalPhoneSchema = z.string().trim().max(32).optional().or(z.literal(""));
const optionalLongTextSchema = z.string().trim().max(4000).optional().or(z.literal(""));
const optionalUrlSchema = z.string().trim().url().optional().or(z.literal(""));
const optionalDateSchema = z.string().trim().date().optional().or(z.literal(""));

export const profileIdParamsSchema = z.object({
  id: idSchema
});

/**
 * Whether this save finishes onboarding.
 *
 * The setup wizard saves after every step so a half-filled profile survives a
 * closed tab, but only the last step may flip `profileCompleted` — the dashboard
 * redirects an incomplete profile back into the wizard, so an early `true` would
 * throw the user out halfway through. Defaults to `true`: an ordinary profile
 * edit says nothing about steps and must keep behaving as it always has.
 */
const completionFlagSchema = z.boolean().optional();

export const studentProfileInputSchema = z.object({
  name: nonEmptyStringSchema.max(255),
  phone: optionalPhoneSchema,
  dateOfBirth: optionalDateSchema.refine(
    (val) => {
      if (!val) return true;
      const date = new Date(val);
      const tenYearsAgo = new Date();
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
      return date <= tenYearsAgo;
    },
    { message: "Student must be at least 10 years old" }
  ),
  guardianName: optionalShortTextSchema,
  guardianPhone: optionalPhoneSchema,
  institution: optionalShortTextSchema,
  classOrGrade: z.string().trim().max(64).optional().or(z.literal("")),
  address: optionalLongTextSchema,
  profilePhoto: optionalUrlSchema,
  isComplete: completionFlagSchema
});

export const teacherProfileInputSchema = z.object({
  name: nonEmptyStringSchema.max(255),
  phone: optionalPhoneSchema,
  bio: optionalLongTextSchema,
  qualifications: optionalLongTextSchema,
  specializations: optionalLongTextSchema,
  profilePhoto: optionalUrlSchema,
  socialLinks: optionalLongTextSchema,
  isComplete: completionFlagSchema
});

export const basicProfileInputSchema = z.object({
  name: nonEmptyStringSchema.max(255),
  profilePhoto: optionalUrlSchema,
  isComplete: completionFlagSchema
});

export type BasicProfileInput = z.infer<typeof basicProfileInputSchema>;
export type StudentProfileInput = z.infer<typeof studentProfileInputSchema>;
export type TeacherProfileInput = z.infer<typeof teacherProfileInputSchema>;
