import type { UserRole } from "@mma/shared";
import {
  basicProfileInputSchema,
  generateUniqueSlug,
  studentProfileInputSchema,
  teacherProfileInputSchema
} from "@mma/shared";
import type { z } from "zod";

import {
  ProfileRepository,
  type ProfileUserRecord,
  type StudentProfileRecord,
  type TeacherCourseRecord,
  type TeacherProfileRecord
} from "@/repositories/profile-repository";
import { ForbiddenError, NotFoundError } from "@/utils/errors";

type StudentProfileInput = z.infer<typeof studentProfileInputSchema>;
type TeacherProfileInput = z.infer<typeof teacherProfileInputSchema>;
type BasicProfileInput = z.infer<typeof basicProfileInputSchema>;

interface ProfileUserResponse {
  email: string;
  id: string;
  image: string | null;
  isActive: boolean;
  name: string;
  profileCompleted: boolean;
  role: UserRole;
  slug: string | null;
}

interface StudentProfileResponse {
  address: string | null;
  classOrGrade: string | null;
  dateOfBirth: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  institution: string | null;
  phone: string | null;
  profilePhoto: string | null;
}

interface TeacherProfileResponse {
  bio: string | null;
  phone: string | null;
  profilePhoto: string | null;
  qualifications: string | null;
  socialLinks: string | null;
  specializations: string | null;
}

export interface OwnProfileResponse {
  studentProfile: StudentProfileResponse | null;
  teacherProfile: TeacherProfileResponse | null;
  user: ProfileUserResponse;
}

interface TeacherCourseResponse {
  coverImageUrl: string | null;
  description: string;
  id: string;
  price: string;
  reviewAverage: number | null;
  reviewCount: number;
  slug: string;
  title: string;
}

export interface PublicTeacherProfileResponse {
  courses: readonly TeacherCourseResponse[];
  metrics: {
    publishedCourseCount: number;
    reviewAverage: number | null;
    reviewCount: number;
  };
  teacherProfile: TeacherProfileResponse | null;
  user: ProfileUserResponse;
}

function normalizeOptionalString(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function normalizeOptionalDate(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }

  return value.trim().length > 0 ? new Date(value) : null;
}

function mapStudentProfile(profile: StudentProfileRecord | null): StudentProfileResponse | null {
  if (!profile) {
    return null;
  }

  return {
    address: profile.address,
    classOrGrade: profile.classOrGrade,
    dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.toISOString() : null,
    guardianName: profile.guardianName,
    guardianPhone: profile.guardianPhone,
    institution: profile.institution,
    phone: profile.phone,
    profilePhoto: profile.profilePhoto
  };
}

function mapTeacherProfile(profile: TeacherProfileRecord | null): TeacherProfileResponse | null {
  if (!profile) {
    return null;
  }

  return {
    bio: profile.bio,
    phone: profile.phone,
    profilePhoto: profile.profilePhoto,
    qualifications: profile.qualifications,
    socialLinks: profile.socialLinks,
    specializations: profile.specializations
  };
}

function mapUserProfile(record: ProfileUserRecord): OwnProfileResponse {
  return {
    studentProfile: mapStudentProfile(record.studentProfile),
    teacherProfile: mapTeacherProfile(record.teacherProfile),
    user: {
      email: record.email,
      id: record.id,
      image: record.image,
      isActive: record.isActive,
      name: record.name,
      profileCompleted: record.profileCompleted,
      role: record.role,
      slug: record.slug
    }
  };
}

function mapTeacherCourse(course: TeacherCourseRecord): TeacherCourseResponse {
  const reviewCount = course.reviews.length;
  const reviewTotal = course.reviews.reduce((total, review) => total + review.rating, 0);

  return {
    coverImageUrl: course.coverImageUrl,
    description: course.description,
    id: course.id,
    price: course.price,
    reviewAverage: reviewCount > 0 ? Number((reviewTotal / reviewCount).toFixed(1)) : null,
    reviewCount,
    slug: course.slug,
    title: course.title
  };
}

export class ProfileService {
  public constructor(private readonly profileRepository: ProfileRepository) {}

  private async createUniqueUserSlug(
    name: string,
    excludeUserId?: string | undefined
  ): Promise<string> {
    return generateUniqueSlug(name, async (candidate) => {
      const existingUser = await this.profileRepository.findBySlug(candidate);

      return existingUser !== null && existingUser.id !== excludeUserId;
    });
  }

  public async getOwnProfile(userId: string): Promise<OwnProfileResponse> {
    const profile = await this.profileRepository.findByUserId(userId);

    if (!profile) {
      throw new NotFoundError("Profile not found");
    }

    return mapUserProfile(profile);
  }

  public async updateStudentProfile(
    userId: string,
    input: StudentProfileInput
  ): Promise<OwnProfileResponse> {
    const currentProfile = await this.profileRepository.findByUserId(userId);

    if (!currentProfile) {
      throw new NotFoundError("Profile not found");
    }

    const nextName = input.name.trim();
    const nextSlug =
      currentProfile.slug === null || currentProfile.name !== nextName
        ? await this.createUniqueUserSlug(nextName, userId)
        : currentProfile.slug;

    const updatedProfile = await this.profileRepository.saveStudentProfile(userId, {
      address: normalizeOptionalString(input.address),
      classOrGrade: normalizeOptionalString(input.classOrGrade),
      dateOfBirth: normalizeOptionalDate(input.dateOfBirth),
      guardianName: normalizeOptionalString(input.guardianName),
      guardianPhone: normalizeOptionalString(input.guardianPhone),
      institution: normalizeOptionalString(input.institution),
      name: nextName,
      phone: normalizeOptionalString(input.phone),
      profilePhoto: normalizeOptionalString(input.profilePhoto),
      slug: nextSlug
    });

    if (!updatedProfile) {
      throw new NotFoundError("Profile not found");
    }

    return mapUserProfile(updatedProfile);
  }

  public async updateTeacherProfile(
    userId: string,
    input: TeacherProfileInput
  ): Promise<OwnProfileResponse> {
    const currentProfile = await this.profileRepository.findByUserId(userId);

    if (!currentProfile) {
      throw new NotFoundError("Profile not found");
    }

    const nextName = input.name.trim();
    const nextSlug =
      currentProfile.slug === null || currentProfile.name !== nextName
        ? await this.createUniqueUserSlug(nextName, userId)
        : currentProfile.slug;

    const updatedProfile = await this.profileRepository.saveTeacherProfile(userId, {
      bio: normalizeOptionalString(input.bio),
      name: nextName,
      phone: normalizeOptionalString(input.phone),
      profilePhoto: normalizeOptionalString(input.profilePhoto),
      qualifications: normalizeOptionalString(input.qualifications),
      slug: nextSlug,
      socialLinks: normalizeOptionalString(input.socialLinks),
      specializations: normalizeOptionalString(input.specializations)
    });

    if (!updatedProfile) {
      throw new NotFoundError("Profile not found");
    }

    return mapUserProfile(updatedProfile);
  }

  public async updateBasicProfile(
    userId: string,
    input: BasicProfileInput
  ): Promise<OwnProfileResponse> {
    const currentProfile = await this.profileRepository.findByUserId(userId);

    if (!currentProfile) {
      throw new NotFoundError("Profile not found");
    }

    const nextName = input.name.trim();
    const nextSlug =
      currentProfile.slug === null || currentProfile.name !== nextName
        ? await this.createUniqueUserSlug(nextName, userId)
        : currentProfile.slug;

    const updatedProfile = await this.profileRepository.saveBasicProfile(userId, {
      name: nextName,
      profilePhoto: normalizeOptionalString(input.profilePhoto),
      slug: nextSlug
    });

    if (!updatedProfile) {
      throw new NotFoundError("Profile not found");
    }

    return mapUserProfile(updatedProfile);
  }

  public async getPublicTeacherProfileBySlug(slug: string): Promise<PublicTeacherProfileResponse> {
    const teacherProfile = await this.profileRepository.findPublicTeacherBySlug(slug);

    if (!teacherProfile || teacherProfile.role !== "TEACHER") {
      throw new NotFoundError("Teacher profile not found");
    }

    return this.mapPublicTeacherProfile(teacherProfile);
  }

  public async getPublicTeacherProfile(userId: string): Promise<PublicTeacherProfileResponse> {
    const teacherProfile = await this.profileRepository.findPublicTeacherById(userId);

    if (!teacherProfile || teacherProfile.role !== "TEACHER") {
      throw new NotFoundError("Teacher profile not found");
    }

    return this.mapPublicTeacherProfile(teacherProfile);
  }

  private mapPublicTeacherProfile(
    teacherProfile: NonNullable<Awaited<ReturnType<ProfileRepository["findPublicTeacherById"]>>>
  ): PublicTeacherProfileResponse {
    const publishedCourses = teacherProfile.courses
      .filter((course) => course.status === "PUBLISHED")
      .map(mapTeacherCourse);

    const reviewCount = publishedCourses.reduce((count, course) => count + course.reviewCount, 0);
    const reviewAverage =
      reviewCount > 0
        ? Number(
            (
              publishedCourses.reduce(
                (total, course) => total + (course.reviewAverage ?? 0) * course.reviewCount,
                0
              ) / reviewCount
            ).toFixed(1)
          )
        : null;

    return {
      courses: publishedCourses,
      metrics: {
        publishedCourseCount: publishedCourses.length,
        reviewAverage,
        reviewCount
      },
      teacherProfile: mapTeacherProfile(teacherProfile.teacherProfile),
      user: {
        email: teacherProfile.email,
        id: teacherProfile.id,
        image: teacherProfile.image,
        isActive: teacherProfile.isActive,
        name: teacherProfile.name,
        profileCompleted: teacherProfile.profileCompleted,
        role: teacherProfile.role,
        slug: teacherProfile.slug
      }
    };
  }

  public async getAdminStudentProfile(userId: string): Promise<OwnProfileResponse> {
    const profile = await this.profileRepository.findByUserId(userId);

    if (!profile) {
      throw new NotFoundError("Student profile not found");
    }

    if (profile.role !== "STUDENT") {
      throw new ForbiddenError("Only student profiles can be viewed from this endpoint");
    }

    return mapUserProfile(profile);
  }
}
