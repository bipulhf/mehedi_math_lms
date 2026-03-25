import {
  basicProfileInputSchema,
  studentProfileInputSchema,
  teacherProfileInputSchema
} from "@mma/shared";
import type { UserRole } from "@mma/shared";
import type { z } from "zod";

import { apiGet, apiPut } from "@/lib/api/client";
import { apiPost } from "@/lib/api/client";

export interface ProfileUser {
  email: string;
  id: string;
  image: string | null;
  isActive: boolean;
  name: string;
  profileCompleted: boolean;
  role: UserRole;
  slug: string | null;
}

export interface StudentProfile {
  address: string | null;
  classOrGrade: string | null;
  dateOfBirth: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  institution: string | null;
  phone: string | null;
  profilePhoto: string | null;
}

export interface TeacherProfile {
  bio: string | null;
  phone: string | null;
  profilePhoto: string | null;
  qualifications: string | null;
  socialLinks: string | null;
  specializations: string | null;
}

export interface OwnProfileData {
  studentProfile: StudentProfile | null;
  teacherProfile: TeacherProfile | null;
  user: ProfileUser;
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

export interface PublicTeacherProfileData {
  courses: readonly TeacherCourseSummary[];
  metrics: {
    publishedCourseCount: number;
    reviewAverage: number | null;
    reviewCount: number;
  };
  teacherProfile: TeacherProfile | null;
  user: ProfileUser;
}

export type StudentProfileInput = z.infer<typeof studentProfileInputSchema>;
export type TeacherProfileInput = z.infer<typeof teacherProfileInputSchema>;
export type BasicProfileInput = z.infer<typeof basicProfileInputSchema>;

interface ProfilePhotoUploadPayload {
  contentType: string;
  fileName: string;
}

interface ProfilePhotoUploadResponse {
  key: string;
  publicUrl: string;
  uploadUrl: string;
}

export async function getOwnProfile(): Promise<OwnProfileData> {
  const response = await apiGet<OwnProfileData>("profiles/me");

  return response.data;
}

export async function updateStudentProfile(values: StudentProfileInput): Promise<OwnProfileData> {
  const response = await apiPut<StudentProfileInput, OwnProfileData>("profiles/me", values);

  return response.data;
}

export async function updateTeacherProfile(values: TeacherProfileInput): Promise<OwnProfileData> {
  const response = await apiPut<TeacherProfileInput, OwnProfileData>("profiles/me", values);

  return response.data;
}

export async function updateBasicProfile(values: BasicProfileInput): Promise<OwnProfileData> {
  const response = await apiPut<BasicProfileInput, OwnProfileData>("profiles/me", values);

  return response.data;
}

export async function getPublicTeacherProfile(id: string): Promise<PublicTeacherProfileData> {
  const response = await apiGet<PublicTeacherProfileData>(`profiles/teachers/${id}`);

  return response.data;
}

export async function getAdminStudentProfile(id: string): Promise<OwnProfileData> {
  const response = await apiGet<OwnProfileData>(`admin/users/${id}/profile`);

  return response.data;
}

export async function uploadProfilePhoto(file: File): Promise<string> {
  const response = await apiPost<ProfilePhotoUploadPayload, ProfilePhotoUploadResponse>(
    "upload/profile-photo/presign",
    {
      contentType: file.type,
      fileName: file.name
    }
  );
  const uploadResponse = await fetch(response.data.uploadUrl, {
    body: file,
    headers: {
      "Content-Type": file.type
    },
    method: "PUT"
  });

  if (!uploadResponse.ok) {
    throw new Error("Profile photo upload failed");
  }

  return response.data.publicUrl;
}
