import type { BasicProfileInput, StudentProfileInput, TeacherProfileInput } from "@mma/shared";

import { apiGet, apiPut } from "@/src/lib/api-client";

/** The signed-in user's profile, and the public teacher directory. */

export interface TeacherDirectoryEntry {
  bio: string | null;
  courseCount: number;
  id: string;
  name: string;
  profilePhoto: string | null;
  slug: string;
  specializations: string | null;
  studentCount: number;
}

export interface TeacherCourseSummary {
  coverImageUrl: string | null;
  description: string;
  id: string;
  price: string;
  reviewAverage: number | null;
  reviewCount: number;
  slug: string;
  title: string;
}

export interface PublicTeacherProfile {
  courses: readonly TeacherCourseSummary[];
  metrics: {
    publishedCourseCount: number;
    reviewAverage: number | null;
    reviewCount: number;
  };
  teacherProfile: {
    bio: string | null;
    phone: string | null;
    profilePhoto: string | null;
    qualifications: string | null;
    socialLinks: string | null;
    specializations: string | null;
  } | null;
  user: {
    image: string | null;
    name: string;
    slug: string | null;
  };
}

export interface StudentProfileFields {
  address: string | null;
  classOrGrade: string | null;
  dateOfBirth: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  institution: string | null;
  phone: string | null;
  profilePhoto: string | null;
}

export interface TeacherProfileFields {
  bio: string | null;
  phone: string | null;
  profilePhoto: string | null;
  qualifications: string | null;
  socialLinks: string | null;
  specializations: string | null;
}

/**
 * The shape `GET /profiles/me` actually answers with — the user record and
 * whichever role-specific block applies, not a flattened summary.
 */
export interface OwnProfile {
  studentProfile: StudentProfileFields | null;
  teacherProfile: TeacherProfileFields | null;
  user: {
    email: string;
    id: string;
    image: string | null;
    isActive: boolean;
    name: string;
    profileCompleted: boolean;
    role: "STUDENT" | "TEACHER" | "ACCOUNTANT" | "ADMIN";
    slug: string | null;
  };
}

export async function listPublicTeachers(): Promise<readonly TeacherDirectoryEntry[]> {
  return apiGet<readonly TeacherDirectoryEntry[]>("profiles/teachers");
}

export async function getPublicTeacherBySlug(slug: string): Promise<PublicTeacherProfile> {
  return apiGet<PublicTeacherProfile>(`profiles/teachers/by-slug/${encodeURIComponent(slug)}`);
}

export async function getOwnProfile(): Promise<OwnProfile> {
  return apiGet<OwnProfile>("profiles/me");
}

/**
 * One endpoint for every role: the API picks the schema from the session's role
 * rather than from anything sent here, so the caller sends the shape that
 * matches its own role and nothing else.
 */
export async function updateOwnProfile(
  input: BasicProfileInput | StudentProfileInput | TeacherProfileInput
): Promise<OwnProfile> {
  return apiPut<typeof input, OwnProfile>("profiles/me", input);
}
