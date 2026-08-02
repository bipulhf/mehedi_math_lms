import { describe, expect, test } from "bun:test";

import type { CategoryRepository } from "@/repositories/category-repository";
import type {
  CourseRecord,
  CourseRepository,
  CourseTeacherAssignment
} from "@/repositories/course-repository";
import { CourseService } from "@/services/course-service";
import type { NotificationService } from "@/services/notification-service";
import { ConflictError, ForbiddenError, ValidationError } from "@/utils/errors";

/**
 * Course authority under ADR-0006. An Owner controls the roster, price, and
 * catalog standing; a Teacher works on content only. A course is never left
 * without an owner.
 */

interface TeacherSpec {
  id: string;
  role: "OWNER" | "TEACHER";
}

interface Overrides {
  creatorId?: string;
  isExamOnly?: boolean;
  lectureCount?: number;
  status?: string;
  teachers?: readonly TeacherSpec[];
}

interface Calls {
  createdOwnerIds: (string | null)[];
  rosters: CourseTeacherAssignment[][];
}

function buildService(overrides: Overrides = {}): { calls: Calls; service: CourseService } {
  const calls: Calls = { createdOwnerIds: [], rosters: [] };
  const teachers = (overrides.teachers ?? [{ id: "teacher-1", role: "OWNER" as const }]).map(
    (teacher) => ({
      email: `${teacher.id}@example.com`,
      id: teacher.id,
      name: teacher.id,
      profilePhoto: null,
      role: teacher.role,
      slug: teacher.id
    })
  );

  const course = {
    category: { id: "cat-1", name: "HSC", slug: "hsc" },
    coverImageUrl: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    creator: {
      id: overrides.creatorId ?? "teacher-1",
      name: "Creator",
      role: "TEACHER",
      slug: "creator"
    },
    description: "A course",
    id: "course-1",
    isExamOnly: overrides.isExamOnly ?? false,
    price: "0.00",
    publishedAt: null,
    rejectedAt: null,
    reviewFeedback: null,
    slug: "a-course",
    status: overrides.status ?? "DRAFT",
    submittedAt: null,
    teachers,
    title: "A course",
    updatedAt: new Date("2026-01-01T00:00:00Z")
  } as unknown as CourseRecord;

  const courseRepository = {
    countLecturesByCourseId: async () => overrides.lectureCount ?? 1,
    countTeachersByIds: async (ids: readonly string[]) => ids.length,
    create: async (input: { ownerTeacherId: string | null }) => {
      calls.createdOwnerIds.push(input.ownerTeacherId);

      return course;
    },
    findById: async () => course,
    findBySlug: async () => null,
    update: async () => course,
    replaceTeachers: async (_courseId: string, entries: readonly CourseTeacherAssignment[]) => {
      calls.rosters.push([...entries]);

      return teachers;
    }
  } as unknown as CourseRepository;

  const categoryRepository = {
    findById: async () => ({ id: "cat-1", isActive: true, name: "HSC", slug: "hsc" })
  } as unknown as CategoryRepository;

  const notificationService = {
    notifyUsers: async () => undefined
  } as unknown as NotificationService;

  return {
    calls,
    service: new CourseService(courseRepository, categoryRepository, notificationService)
  };
}

describe("CourseService — course creation seeds an owner", () => {
  test("a teacher owns the course they create", async () => {
    const { calls, service } = buildService();

    await service.createCourse(
      {
        categoryId: "cat-1",
        description: "A course description",
        isExamOnly: false,
        price: 0,
        title: "A course"
      } as never,
      "teacher-1",
      "TEACHER"
    );

    expect(calls.createdOwnerIds).toEqual(["teacher-1"]);
  });

  test("an admin-created course starts with no owner", async () => {
    // Admins bypass the ownership guard, so the course is not unaccountable;
    // it gets its first owner when teachers are assigned.
    const { calls, service } = buildService();

    await service.createCourse(
      {
        categoryId: "cat-1",
        description: "A course description",
        isExamOnly: false,
        price: 0,
        title: "A course"
      } as never,
      "admin-1",
      "ADMIN"
    );

    expect(calls.createdOwnerIds).toEqual([null]);
  });
});

describe("CourseService.replaceTeachers — authority", () => {
  test("a non-owner teacher on the roster cannot change it", async () => {
    // The escalation ADR-0006 closes: a teacher invited to help with one
    // chapter could previously rewrite the roster and remove the owner.
    const { service } = buildService({
      teachers: [
        { id: "teacher-1", role: "OWNER" },
        { id: "teacher-2", role: "TEACHER" }
      ]
    });

    await expect(
      service.replaceTeachers("course-1", ["teacher-2"], "teacher-2", "TEACHER")
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  test("an owner can change the roster", async () => {
    const { calls, service } = buildService({
      teachers: [{ id: "teacher-1", role: "OWNER" }]
    });

    await service.replaceTeachers(
      "course-1",
      ["teacher-1", "teacher-2"],
      "teacher-1",
      "TEACHER"
    );

    expect(calls.rosters[0]).toEqual([
      { role: "OWNER", teacherId: "teacher-1" },
      { role: "TEACHER", teacherId: "teacher-2" }
    ]);
  });

  test("removing every owner is refused", async () => {
    const { service } = buildService({
      teachers: [
        { id: "teacher-1", role: "OWNER" },
        { id: "teacher-2", role: "TEACHER" }
      ]
    });

    await expect(
      service.replaceTeachers("course-1", ["teacher-2"], "admin-1", "ADMIN")
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test("an ownerless course gets its first owner from the new roster", async () => {
    const { calls, service } = buildService({ teachers: [] });

    await service.replaceTeachers(
      "course-1",
      ["teacher-3", "teacher-4"],
      "admin-1",
      "ADMIN"
    );

    expect(calls.rosters[0]).toEqual([
      { role: "OWNER", teacherId: "teacher-3" },
      { role: "TEACHER", teacherId: "teacher-4" }
    ]);
  });

  test("ownership survives a roster change that keeps the owner", async () => {
    const { calls, service } = buildService({
      teachers: [
        { id: "teacher-1", role: "OWNER" },
        { id: "teacher-2", role: "TEACHER" }
      ]
    });

    await service.replaceTeachers(
      "course-1",
      ["teacher-1", "teacher-5"],
      "admin-1",
      "ADMIN"
    );

    expect(calls.rosters[0]).toEqual([
      { role: "OWNER", teacherId: "teacher-1" },
      { role: "TEACHER", teacherId: "teacher-5" }
    ]);
  });
});

describe("CourseService — administer guard", () => {
  test("a teacher who is not on the roster cannot withdraw the course", async () => {
    const { service } = buildService({
      teachers: [{ id: "teacher-1", role: "OWNER" }]
    });

    await expect(
      service.withdrawCourse("course-1", "teacher-9", "TEACHER")
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  test("a non-owner teacher cannot withdraw the course", async () => {
    const { service } = buildService({
      teachers: [
        { id: "teacher-1", role: "OWNER" },
        { id: "teacher-2", role: "TEACHER" }
      ]
    });

    await expect(
      service.withdrawCourse("course-1", "teacher-2", "TEACHER")
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("CourseService — withdraw and restore", () => {
  test("withdrawing a course that is already withdrawn is refused", async () => {
    const { service } = buildService({ status: "ARCHIVED" });

    await expect(
      service.withdrawCourse("course-1", "teacher-1", "TEACHER")
    ).rejects.toBeInstanceOf(ConflictError);
  });

  test("only a withdrawn course can be restored", async () => {
    const { service } = buildService({ status: "DRAFT" });

    await expect(
      service.restoreCourse("course-1", "teacher-1", "TEACHER")
    ).rejects.toBeInstanceOf(ConflictError);
  });

  test("a non-owner cannot restore", async () => {
    const { service } = buildService({
      status: "ARCHIVED",
      teachers: [
        { id: "teacher-1", role: "OWNER" },
        { id: "teacher-2", role: "TEACHER" }
      ]
    });

    await expect(
      service.restoreCourse("course-1", "teacher-2", "TEACHER")
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("CourseService — exam-only enforcement", () => {
  test("an exam-only course with lectures cannot be submitted", async () => {
    const { service } = buildService({ isExamOnly: true, lectureCount: 3 });

    await expect(
      service.submitCourse("course-1", "teacher-1", "TEACHER")
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test("an ordinary course with no lectures cannot be submitted", async () => {
    const { service } = buildService({ isExamOnly: false, lectureCount: 0 });

    await expect(
      service.submitCourse("course-1", "teacher-1", "TEACHER")
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test("an exam-only course with no lectures submits fine", async () => {
    const { service } = buildService({ isExamOnly: true, lectureCount: 0 });

    await expect(
      service.submitCourse("course-1", "teacher-1", "TEACHER")
    ).resolves.toBeDefined();
  });

  test("marking a course exam-only is refused while it has lectures", async () => {
    const { service } = buildService({ isExamOnly: false, lectureCount: 2 });

    await expect(
      service.updateCourse("course-1", { isExamOnly: true }, "teacher-1", "TEACHER")
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
