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

export const studentProfileInputSchema = z.object({
  name: nonEmptyStringSchema.max(255),
  phone: optionalPhoneSchema,
  dateOfBirth: optionalDateSchema,
  guardianName: optionalShortTextSchema,
  guardianPhone: optionalPhoneSchema,
  institution: optionalShortTextSchema,
  classOrGrade: z.string().trim().max(64).optional().or(z.literal("")),
  address: optionalLongTextSchema,
  profilePhoto: optionalUrlSchema
});

export const teacherProfileInputSchema = z.object({
  name: nonEmptyStringSchema.max(255),
  phone: optionalPhoneSchema,
  bio: optionalLongTextSchema,
  qualifications: optionalLongTextSchema,
  specializations: optionalLongTextSchema,
  profilePhoto: optionalUrlSchema,
  socialLinks: optionalLongTextSchema
});

export const basicProfileInputSchema = z.object({
  name: nonEmptyStringSchema.max(255),
  profilePhoto: optionalUrlSchema
});
