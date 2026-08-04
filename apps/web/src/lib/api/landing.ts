import { apiGet, apiPut } from "@/lib/api/client";

export interface LandingRating {
  average: number;
  count: number;
}

export interface LandingCategory {
  courseCount: number;
  description: string | null;
  icon: string | null;
  id: string;
  name: string;
  slug: string;
}

export interface LandingCourse {
  category: { name: string; slug: string };
  coverImageUrl: string | null;
  description: string;
  id: string;
  lectureCount: number;
  price: string;
  rating: LandingRating | null;
  slug: string;
  teacher: { name: string; profilePhoto: string | null; slug: string | null } | null;
  title: string;
}

export interface LandingTeacher {
  bio: string | null;
  courseCount: number;
  id: string;
  name: string;
  profilePhoto: string | null;
  slug: string | null;
  specializations: string | null;
  studentCount: number;
}

export interface LandingStats {
  publishedCourses: number;
  rating: LandingRating | null;
  students: number;
  teachers: number;
}

export interface LandingSnapshot {
  categories: readonly LandingCategory[];
  courses: readonly LandingCourse[];
  stats: LandingStats;
  teachers: readonly LandingTeacher[];
}

export interface FeaturedCourse {
  id: string;
  slug: string;
  title: string;
}

export async function getLandingSnapshot(): Promise<LandingSnapshot> {
  const response = await apiGet<LandingSnapshot>("landing");

  return response.data;
}

export async function getFeaturedCourses(): Promise<readonly FeaturedCourse[]> {
  const response = await apiGet<readonly FeaturedCourse[]>("admin/landing/featured");

  return response.data;
}

export async function updateFeaturedCourses(courseIds: readonly string[]): Promise<void> {
  await apiPut<{ courseIds: readonly string[] }, null>("admin/landing/featured", { courseIds });
}
