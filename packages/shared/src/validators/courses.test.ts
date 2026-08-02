import { describe, expect, test } from "bun:test";

import {
  courseIdParamsSchema,
  courseStatusSchema,
  courseTeacherIdsSchema,
  createCourseSchema,
  listCoursesQuerySchema,
  rejectCourseSchema,
  updateCourseSchema
} from "./courses";

const UUID = "11111111-1111-4111-8111-111111111111";
const OTHER_UUID = "22222222-2222-4222-8222-222222222222";

function validCourse(): Record<string, unknown> {
  return {
    categoryId: UUID,
    description: "A description long enough to clear the twenty-four character floor.",
    price: 1200,
    title: "Higher Mathematics"
  };
}

describe("courseStatusSchema", () => {
  test("is exactly the four states the database enum declares", () => {
    expect(courseStatusSchema.options).toEqual(["DRAFT", "PENDING", "PUBLISHED", "ARCHIVED"]);
  });

  test("rejects a status that is not one of them", () => {
    expect(courseStatusSchema.safeParse("LIVE").success).toBe(false);
  });
});

describe("createCourseSchema", () => {
  test("accepts a complete course and defaults isExamOnly to false", () => {
    expect(createCourseSchema.parse(validCourse())).toMatchObject({
      isExamOnly: false,
      price: 1200
    });
  });

  test("requires a category id that is a uuid", () => {
    expect(createCourseSchema.safeParse({ ...validCourse(), categoryId: "maths" }).success).toBe(
      false
    );
  });

  test("holds the title and description floors", () => {
    expect(createCourseSchema.safeParse({ ...validCourse(), title: "AB" }).success).toBe(false);
    expect(createCourseSchema.safeParse({ ...validCourse(), description: "Too short" }).success).toBe(
      false
    );
  });

  test("coerces a form's string price and refuses a negative one", () => {
    expect(createCourseSchema.parse({ ...validCourse(), price: "0" }).price).toBe(0);
    expect(createCourseSchema.safeParse({ ...validCourse(), price: -1 }).success).toBe(false);
  });

  test("treats an empty cover image url as absent rather than invalid", () => {
    expect(createCourseSchema.parse({ ...validCourse(), coverImageUrl: "" }).coverImageUrl).toBe(
      undefined
    );
    expect(
      createCourseSchema.safeParse({ ...validCourse(), coverImageUrl: "not-a-url" }).success
    ).toBe(false);
  });
});

describe("updateCourseSchema", () => {
  test("accepts a single field", () => {
    expect(updateCourseSchema.parse({ title: "Renamed course" })).toEqual({
      title: "Renamed course"
    });
  });

  test("refuses an empty patch, which would be a no-op write", () => {
    expect(updateCourseSchema.safeParse({}).success).toBe(false);
  });
});

describe("courseTeacherIdsSchema", () => {
  test("accepts an empty roster and caps it at ten", () => {
    expect(courseTeacherIdsSchema.parse({ teacherIds: [] }).teacherIds).toEqual([]);
    expect(
      courseTeacherIdsSchema.safeParse({ teacherIds: Array.from({ length: 11 }, () => UUID) })
        .success
    ).toBe(false);
  });

  test("rejects a roster entry that is not a uuid", () => {
    expect(courseTeacherIdsSchema.safeParse({ teacherIds: ["someone"] }).success).toBe(false);
  });
});

describe("rejectCourseSchema", () => {
  test("insists on feedback a teacher can act on", () => {
    expect(rejectCourseSchema.safeParse({ feedback: "no" }).success).toBe(false);
    expect(rejectCourseSchema.parse({ feedback: "Add a syllabus." }).feedback).toBe(
      "Add a syllabus."
    );
  });
});

describe("listCoursesQuerySchema", () => {
  test("defaults to twelve courses on page one", () => {
    expect(listCoursesQuerySchema.parse({})).toMatchObject({ limit: 12, page: 1 });
  });

  test("coerces query-string numbers and caps the page size at fifty", () => {
    expect(listCoursesQuerySchema.parse({ limit: "24", page: "3" })).toMatchObject({
      limit: 24,
      page: 3
    });
    expect(listCoursesQuerySchema.safeParse({ limit: "51" }).success).toBe(false);
  });

  test("`mine=false` narrows nothing, instead of coercing to true", () => {
    expect(listCoursesQuerySchema.parse({ mine: "false" }).mine).toBe(false);
    expect(listCoursesQuerySchema.parse({ mine: "true" }).mine).toBe(true);
    expect(listCoursesQuerySchema.parse({}).mine).toBe(undefined);
    expect(listCoursesQuerySchema.safeParse({ mine: "maybe" }).success).toBe(false);
  });

  test("rejects a category id that is not a uuid", () => {
    expect(listCoursesQuerySchema.safeParse({ categoryId: OTHER_UUID }).success).toBe(true);
    expect(listCoursesQuerySchema.safeParse({ categoryId: "algebra" }).success).toBe(false);
  });
});

describe("courseIdParamsSchema", () => {
  test("guards the path parameter", () => {
    expect(courseIdParamsSchema.parse({ id: UUID }).id).toBe(UUID);
    expect(courseIdParamsSchema.safeParse({ id: "1" }).success).toBe(false);
  });
});
