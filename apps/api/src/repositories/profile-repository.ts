import {
  and,
  courseTeachers,
  courses,
  db,
  eq,
  isNotNull,
  reviews,
  studentProfiles,
  teacherProfiles,
  users
} from "@mma/db";

import type { UserRole } from "@mma/shared";

export interface StudentProfileRecord {
  address: string | null;
  classOrGrade: string | null;
  dateOfBirth: Date | null;
  guardianName: string | null;
  guardianPhone: string | null;
  institution: string | null;
  phone: string | null;
  profilePhoto: string | null;
}

export interface TeacherProfileRecord {
  bio: string | null;
  phone: string | null;
  profilePhoto: string | null;
  qualifications: string | null;
  socialLinks: string | null;
  specializations: string | null;
}

export interface ProfileUserRecord {
  email: string;
  id: string;
  image: string | null;
  isActive: boolean;
  name: string;
  profileCompleted: boolean;
  role: UserRole;
  slug: string | null;
  studentProfile: StudentProfileRecord | null;
  teacherProfile: TeacherProfileRecord | null;
}

export interface TeacherCourseReviewRecord {
  rating: number;
}

export interface TeacherCourseRecord {
  coverImageUrl: string | null;
  description: string;
  id: string;
  price: string;
  reviews: readonly TeacherCourseReviewRecord[];
  slug: string;
  status: "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED";
  title: string;
}

export interface PublicTeacherProfileRecord extends ProfileUserRecord {
  courses: readonly TeacherCourseRecord[];
}

export interface StudentProfileInputRecord {
  address: string | null;
  classOrGrade: string | null;
  dateOfBirth: Date | null;
  guardianName: string | null;
  guardianPhone: string | null;
  institution: string | null;
  name: string;
  phone: string | null;
  profilePhoto: string | null;
  slug: string;
}

export interface TeacherProfileInputRecord {
  bio: string | null;
  name: string;
  phone: string | null;
  profilePhoto: string | null;
  qualifications: string | null;
  slug: string;
  socialLinks: string | null;
  specializations: string | null;
}

export interface BasicProfileInputRecord {
  name: string;
  profilePhoto: string | null;
  slug: string;
}

function mapProfileUserRecord(
  user:
    | {
        email: string;
        id: string;
        image: string | null;
        isActive: boolean;
        name: string;
        profileCompleted: boolean;
        role: string;
        slug: string | null;
        studentProfile: StudentProfileRecord | null;
        teacherProfile: TeacherProfileRecord | null;
      }
    | undefined
): ProfileUserRecord | null {
  if (!user) {
    return null;
  }

  return {
    email: user.email,
    id: user.id,
    image: user.image,
    isActive: user.isActive,
    name: user.name,
    profileCompleted: user.profileCompleted,
    role: user.role as UserRole,
    slug: user.slug,
    studentProfile: user.studentProfile,
    teacherProfile: user.teacherProfile
  };
}

export class ProfileRepository {
  public async findByUserId(userId: string): Promise<ProfileUserRecord | null> {
    const user = await db.query.users.findFirst({
      columns: {
        email: true,
        id: true,
        image: true,
        isActive: true,
        name: true,
        profileCompleted: true,
        role: true,
        slug: true
      },
      where: eq(users.id, userId),
      with: {
        studentProfile: {
          columns: {
            address: true,
            classOrGrade: true,
            dateOfBirth: true,
            guardianName: true,
            guardianPhone: true,
            institution: true,
            phone: true,
            profilePhoto: true
          }
        },
        teacherProfile: {
          columns: {
            bio: true,
            phone: true,
            profilePhoto: true,
            qualifications: true,
            socialLinks: true,
            specializations: true
          }
        }
      }
    });

    return mapProfileUserRecord(user);
  }

  public async findPublicTeacherBySlug(slug: string): Promise<PublicTeacherProfileRecord | null> {
    const match = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.slug, slug),
          eq(users.role, "TEACHER"),
          eq(users.isActive, true),
          eq(users.banned, false),
          isNotNull(users.slug)
        )
      )
      .limit(1);

    const userId = match[0]?.id;

    if (!userId) {
      return null;
    }

    return this.findPublicTeacherById(userId);
  }

  public async findPublicTeacherById(userId: string): Promise<PublicTeacherProfileRecord | null> {
    const user = await db.query.users.findFirst({
      columns: {
        email: true,
        id: true,
        image: true,
        isActive: true,
        name: true,
        profileCompleted: true,
        role: true,
        slug: true
      },
      where: eq(users.id, userId),
      with: {
        courseAssignments: {
          columns: {},
          with: {
            course: {
              columns: {
                coverImageUrl: true,
                description: true,
                id: true,
                price: true,
                slug: true,
                status: true,
                title: true
              },
              with: {
                reviews: {
                  columns: {
                    rating: true
                  }
                }
              }
            }
          }
        },
        teacherProfile: {
          columns: {
            bio: true,
            phone: true,
            profilePhoto: true,
            qualifications: true,
            socialLinks: true,
            specializations: true
          }
        }
      }
    });

    const mappedUser = mapProfileUserRecord(
      user
        ? {
            ...user,
            studentProfile: null
          }
        : undefined
    );

    if (!mappedUser || !user) {
      return null;
    }

    return {
      ...mappedUser,
      courses: user.courseAssignments.map((assignment) => assignment.course)
    };
  }

  public async saveStudentProfile(userId: string, input: StudentProfileInputRecord): Promise<ProfileUserRecord | null> {
    await db.transaction(async (transaction) => {
      await transaction
        .update(users)
        .set({
          image: input.profilePhoto,
          name: input.name,
          profileCompleted: true,
          slug: input.slug,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      const existingProfile = await transaction
        .select({ userId: studentProfiles.userId })
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, userId))
        .limit(1);

      if (existingProfile[0]) {
        await transaction
          .update(studentProfiles)
          .set({
            address: input.address,
            classOrGrade: input.classOrGrade,
            dateOfBirth: input.dateOfBirth,
            guardianName: input.guardianName,
            guardianPhone: input.guardianPhone,
            institution: input.institution,
            phone: input.phone,
            profilePhoto: input.profilePhoto,
            updatedAt: new Date()
          })
          .where(eq(studentProfiles.userId, userId));

        return;
      }

      await transaction.insert(studentProfiles).values({
        address: input.address,
        classOrGrade: input.classOrGrade,
        dateOfBirth: input.dateOfBirth,
        guardianName: input.guardianName,
        guardianPhone: input.guardianPhone,
        institution: input.institution,
        phone: input.phone,
        profilePhoto: input.profilePhoto,
        userId
      });
    });

    return this.findByUserId(userId);
  }

  public async saveTeacherProfile(userId: string, input: TeacherProfileInputRecord): Promise<ProfileUserRecord | null> {
    await db.transaction(async (transaction) => {
      await transaction
        .update(users)
        .set({
          image: input.profilePhoto,
          name: input.name,
          profileCompleted: true,
          slug: input.slug,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      const existingProfile = await transaction
        .select({ userId: teacherProfiles.userId })
        .from(teacherProfiles)
        .where(eq(teacherProfiles.userId, userId))
        .limit(1);

      if (existingProfile[0]) {
        await transaction
          .update(teacherProfiles)
          .set({
            bio: input.bio,
            phone: input.phone,
            profilePhoto: input.profilePhoto,
            qualifications: input.qualifications,
            socialLinks: input.socialLinks,
            specializations: input.specializations,
            updatedAt: new Date()
          })
          .where(eq(teacherProfiles.userId, userId));

        return;
      }

      await transaction.insert(teacherProfiles).values({
        bio: input.bio,
        phone: input.phone,
        profilePhoto: input.profilePhoto,
        qualifications: input.qualifications,
        socialLinks: input.socialLinks,
        specializations: input.specializations,
        userId
      });
    });

    return this.findByUserId(userId);
  }

  public async saveBasicProfile(userId: string, input: BasicProfileInputRecord): Promise<ProfileUserRecord | null> {
    await db
      .update(users)
      .set({
        image: input.profilePhoto,
        name: input.name,
        profileCompleted: true,
        slug: input.slug,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    return this.findByUserId(userId);
  }

  public async findPublishedCoursesByTeacherId(userId: string): Promise<readonly TeacherCourseRecord[]> {
    const teacherCourses = await db
      .select({
        coverImageUrl: courses.coverImageUrl,
        description: courses.description,
        id: courses.id,
        price: courses.price,
        slug: courses.slug,
        status: courses.status,
        title: courses.title
      })
      .from(courseTeachers)
      .innerJoin(courses, eq(courseTeachers.courseId, courses.id))
      .where(eq(courseTeachers.teacherId, userId));

    const courseIds = teacherCourses.map((course) => course.id);

    const courseReviews = courseIds.length
      ? await db
          .select({
            courseId: reviews.courseId,
            rating: reviews.rating
          })
          .from(reviews)
      : [];

    return teacherCourses.map((course) => ({
      ...course,
      reviews: courseReviews
        .filter((review) => review.courseId === course.id)
        .map((review) => ({ rating: review.rating }))
    }));
  }
}
