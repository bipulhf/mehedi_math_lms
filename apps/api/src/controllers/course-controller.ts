import type { Context } from "hono";
import type { UserRole } from "@mma/shared";

import { CourseService } from "@/services/course-service";
import type { AppBindings } from "@/types/app-bindings";
import { paginated, success } from "@/utils/response";

export class CourseController {
  public constructor(private readonly courseService: CourseService) {}

  public async listCourses(
    context: Context<AppBindings>,
    query: Parameters<CourseService["listCourses"]>[0],
    currentUserId?: string | undefined,
    currentUserRole?: UserRole | undefined
  ): Promise<Response> {
    const result = await this.courseService.listCourses(query, currentUserId, currentUserRole);

    return paginated(context, result.items, {
      limit: result.limit,
      page: result.page,
      pages: Math.ceil(result.total / result.limit) || 1,
      total: result.total
    });
  }

  public async getCourseById(
    context: Context<AppBindings>,
    id: string,
    currentUserId?: string | undefined,
    currentUserRole?: UserRole | undefined
  ): Promise<Response> {
    const course = await this.courseService.getCourseById(id, currentUserId, currentUserRole);

    return success(context, course);
  }

  public async createCourse(
    context: Context<AppBindings>,
    input: Parameters<CourseService["createCourse"]>[0],
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const course = await this.courseService.createCourse(input, currentUserId, currentUserRole);

    return success(context, course, 201, "Course created successfully");
  }

  public async updateCourse(
    context: Context<AppBindings>,
    id: string,
    input: Parameters<CourseService["updateCourse"]>[1],
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const course = await this.courseService.updateCourse(id, input, currentUserId, currentUserRole);

    return success(context, course, 200, "Course updated successfully");
  }

  public async deleteCourse(
    context: Context<AppBindings>,
    id: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const deletedCourse = await this.courseService.deleteCourse(id, currentUserId, currentUserRole);

    return success(context, deletedCourse, 200, "Course archived successfully");
  }

  public async submitCourse(
    context: Context<AppBindings>,
    id: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const course = await this.courseService.submitCourse(id, currentUserId, currentUserRole);

    return success(context, course, 200, "Course submitted for review");
  }

  public async approveCourse(context: Context<AppBindings>, id: string): Promise<Response> {
    const course = await this.courseService.approveCourse(id);

    return success(context, course, 200, "Course approved successfully");
  }

  public async rejectCourse(
    context: Context<AppBindings>,
    id: string,
    input: Parameters<CourseService["rejectCourse"]>[1]
  ): Promise<Response> {
    const course = await this.courseService.rejectCourse(id, input);

    return success(context, course, 200, "Course sent back with feedback");
  }

  public async replaceTeachers(
    context: Context<AppBindings>,
    courseId: string,
    teacherIds: readonly string[],
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<Response> {
    const course = await this.courseService.replaceTeachers(
      courseId,
      teacherIds,
      currentUserId,
      currentUserRole
    );

    return success(context, course, 200, "Course teachers updated successfully");
  }

  public async listTeacherDirectory(
    context: Context<AppBindings>,
    search?: string | undefined
  ): Promise<Response> {
    const teachers = await this.courseService.listTeacherDirectory(search);

    return success(context, teachers);
  }
}
