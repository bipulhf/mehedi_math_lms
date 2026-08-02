import type Redis from "ioredis";

import type { LandingCategoryRow, LandingRepository } from "@/repositories/landing-repository";

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
  rating: { average: number; count: number } | null;
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
  rating: { average: number; count: number } | null;
  students: number;
  teachers: number;
}

export interface LandingSnapshot {
  categories: readonly LandingCategory[];
  courses: readonly LandingCourse[];
  stats: LandingStats;
  teachers: readonly LandingTeacher[];
}

const CATEGORY_LIMIT = 4;
const COURSE_LIMIT = 6;
const TEACHER_LIMIT = 4;

/**
 * Rolls a category's published-course count up through its ancestors, so a
 * top-level tile counts everything underneath it rather than only the courses
 * filed directly against it.
 */
function rollUpCourseCounts(rows: readonly LandingCategoryRow[]): readonly LandingCategoryRow[] {
  const byId = new Map(rows.map((row) => [row.id, { ...row }]));

  for (const row of rows) {
    let parentId = row.parentId;
    const seen = new Set<string>([row.id]);

    while (parentId !== null && !seen.has(parentId)) {
      const parent = byId.get(parentId);

      if (!parent) {
        break;
      }

      parent.courseCount += row.courseCount;
      seen.add(parentId);
      parentId = parent.parentId;
    }
  }

  return [...byId.values()];
}

export class LandingService {
  private static readonly CACHE_KEY = "landing:snapshot:v1";
  private static readonly TTL_SECONDS = 300;

  public constructor(
    private readonly landingRepository: LandingRepository,
    private readonly redis: Redis
  ) {}

  public async getSnapshot(): Promise<LandingSnapshot> {
    const cached = await this.redis.get(LandingService.CACHE_KEY);

    if (cached) {
      return JSON.parse(cached) as LandingSnapshot;
    }

    const snapshot = await this.buildSnapshot();

    await this.redis.setex(
      LandingService.CACHE_KEY,
      LandingService.TTL_SECONDS,
      JSON.stringify(snapshot)
    );

    return snapshot;
  }

  private async buildSnapshot(): Promise<LandingSnapshot> {
    const [categoryRows, courseRows, teacherRows, statsRow] = await Promise.all([
      this.landingRepository.listActiveCategories(),
      this.landingRepository.listFeaturedCourses(COURSE_LIMIT),
      this.landingRepository.listFeaturedTeachers(TEACHER_LIMIT),
      this.landingRepository.getStats()
    ]);

    const categories = rollUpCourseCounts(categoryRows)
      .filter((row) => row.parentId === null)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .slice(0, CATEGORY_LIMIT)
      .map((row) => ({
        courseCount: row.courseCount,
        description: row.description,
        icon: row.icon,
        id: row.id,
        name: row.name,
        slug: row.slug
      }));

    return {
      categories,
      courses: courseRows.map((row) => ({
        category: { name: row.categoryName, slug: row.categorySlug },
        coverImageUrl: row.coverImageUrl,
        description: row.description,
        id: row.id,
        lectureCount: row.lectureCount,
        price: row.price,
        rating:
          row.ratingAverage === null || row.ratingCount === 0
            ? null
            : { average: Math.round(row.ratingAverage * 10) / 10, count: row.ratingCount },
        slug: row.slug,
        teacher:
          row.teacherName === null
            ? null
            : { name: row.teacherName, profilePhoto: row.teacherPhoto, slug: row.teacherSlug },
        title: row.title
      })),
      stats: {
        publishedCourses: statsRow.publishedCourses,
        rating:
          statsRow.ratingAverage === null || statsRow.ratingCount === 0
            ? null
            : {
                average: Math.round(statsRow.ratingAverage * 10) / 10,
                count: statsRow.ratingCount
              },
        students: statsRow.students,
        teachers: statsRow.teachers
      },
      teachers: teacherRows.map((row) => ({
        bio: row.bio,
        courseCount: row.courseCount,
        id: row.id,
        name: row.name,
        profilePhoto: row.profilePhoto,
        slug: row.slug,
        specializations: row.specializations,
        studentCount: row.studentCount
      }))
    };
  }
}
