import { describe, expect, test } from "bun:test";

import { upsertCourseRoutineSchema } from "./course-routines";

describe("course routine", () => {
  test("written text alone is a routine", () => {
    const result = upsertCourseRoutineSchema.safeParse({
      content: "<p>Saturday 9am, Sunday 11am</p>"
    });

    expect(result.success).toBe(true);
  });

  test("an attachment alone is a routine", () => {
    const result = upsertCourseRoutineSchema.safeParse({
      attachmentName: "routine.pdf",
      attachmentUrl: "https://files.example.com/routine.pdf"
    });

    expect(result.success).toBe(true);
  });

  test("both together are allowed", () => {
    const result = upsertCourseRoutineSchema.safeParse({
      attachmentUrl: "https://files.example.com/routine.pdf",
      content: "<p>Saturday 9am</p>"
    });

    expect(result.success).toBe(true);
  });

  test("neither is refused rather than saved blank", () => {
    const result = upsertCourseRoutineSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  test("markup with no words in it does not count as written", () => {
    const result = upsertCourseRoutineSchema.safeParse({ content: "<p></p><p><br></p>" });

    expect(result.success).toBe(false);
  });

  test("a cleared routine sends nulls and is still refused", () => {
    const result = upsertCourseRoutineSchema.safeParse({
      attachmentName: null,
      attachmentUrl: null,
      content: null
    });

    expect(result.success).toBe(false);
  });

  test("an attachment that is not a URL is refused", () => {
    const result = upsertCourseRoutineSchema.safeParse({ attachmentUrl: "routine.pdf" });

    expect(result.success).toBe(false);
  });
});
