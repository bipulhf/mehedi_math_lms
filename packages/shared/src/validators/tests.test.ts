import { describe, expect, test } from "bun:test";

import {
  addScriptPageSchema,
  createQuestionSchema,
  createTestSchema,
  reorderCourseItemsSchema,
  reorderScriptPagesSchema,
  saveSubmissionAnswersSchema,
  setAnswerMarkSchema,
  submitTestSchema,
  testTypeSchema,
  updateQuestionSchema,
  updateTestSchema
} from "./tests";

const UUID = "11111111-1111-4111-8111-111111111111";
const OTHER_UUID = "22222222-2222-4222-8222-222222222222";

describe("testTypeSchema", () => {
  test("matches the database enum — a Test is one kind, never mixed", () => {
    expect(testTypeSchema.options).toEqual(["MCQ", "WRITTEN"]);
  });
});

describe("createTestSchema", () => {
  test("defaults to unpublished, so a draft never goes live by omission", () => {
    expect(createTestSchema.parse({ title: "Weekly quiz", type: "MCQ" }).isPublished).toBe(false);
  });

  test("caps the duration at a day", () => {
    const base = { title: "Weekly quiz", type: "MCQ" };

    expect(createTestSchema.safeParse({ ...base, durationInMinutes: 24 * 60 }).success).toBe(true);
    expect(createTestSchema.safeParse({ ...base, durationInMinutes: 24 * 60 + 1 }).success).toBe(
      false
    );
    expect(createTestSchema.safeParse({ ...base, durationInMinutes: 0 }).success).toBe(false);
  });

  test("a passing score can be a half mark", () => {
    const base = { title: "Weekly quiz", type: "WRITTEN" };

    expect(createTestSchema.safeParse({ ...base, passingScore: 17.5 }).success).toBe(true);
    expect(createTestSchema.safeParse({ ...base, passingScore: 17.555 }).success).toBe(false);
  });
});

describe("updateTestSchema", () => {
  test("refuses an empty patch", () => {
    expect(updateTestSchema.safeParse({}).success).toBe(false);
  });
});

describe("createQuestionSchema", () => {
  test("carries no type of its own — the Test decides", () => {
    const parsed = createQuestionSchema.parse({ marks: 10, questionText: "Prove it." });

    expect("type" in parsed).toBe(false);
  });

  test("marks may be halved but not thirded, and must be above zero", () => {
    const base = { questionText: "Prove it." };

    expect(createQuestionSchema.safeParse({ ...base, marks: 2.5 }).success).toBe(true);
    expect(createQuestionSchema.safeParse({ ...base, marks: 2.333 }).success).toBe(false);
    expect(createQuestionSchema.safeParse({ ...base, marks: 0 }).success).toBe(false);
    expect(createQuestionSchema.safeParse({ ...base, marks: 101 }).success).toBe(false);
  });

  test("caps options at eight and images at eight", () => {
    const options = Array.from({ length: 9 }, (_, index) => ({
      isCorrect: index === 0,
      optionText: `Option ${index}`
    }));

    expect(
      createQuestionSchema.safeParse({ marks: 5, options, questionText: "2 + 2 = ?" }).success
    ).toBe(false);
    expect(
      createQuestionSchema.safeParse({
        imageUploadIds: Array.from({ length: 9 }, () => UUID),
        marks: 5,
        questionText: "See the diagram."
      }).success
    ).toBe(false);
  });
});

describe("updateQuestionSchema", () => {
  test("refuses an empty patch", () => {
    expect(updateQuestionSchema.safeParse({}).success).toBe(false);
  });
});

describe("reorderCourseItemsSchema", () => {
  test("orders lectures and exams in the same chapter outline", () => {
    expect(
      reorderCourseItemsSchema.safeParse({
        items: [
          { chapterId: UUID, id: OTHER_UUID, kind: "LECTURE", sortOrder: 0 },
          { chapterId: UUID, id: UUID, kind: "EXAM", sortOrder: 1 }
        ]
      }).success
    ).toBe(true);
  });

  test("rejects an unknown item kind", () => {
    expect(
      reorderCourseItemsSchema.safeParse({
        items: [{ chapterId: UUID, id: OTHER_UUID, kind: "PDF", sortOrder: 0 }]
      }).success
    ).toBe(false);
  });
});

describe("submission answers", () => {
  const answer = { questionId: UUID, selectedOptionId: OTHER_UUID };

  test("both saving and submitting cap the answer sheet at 200", () => {
    const overLong = { answers: Array.from({ length: 201 }, () => answer) };

    expect(saveSubmissionAnswersSchema.safeParse(overLong).success).toBe(false);
    expect(submitTestSchema.safeParse(overLong).success).toBe(false);
  });

  test("submitting a written paper sends no answers at all", () => {
    expect(submitTestSchema.parse({}).answers).toEqual([]);
  });

  test("an answer must point at a real question id", () => {
    expect(submitTestSchema.safeParse({ answers: [{ questionId: "q1" }] }).success).toBe(false);
  });
});

describe("script pages", () => {
  test("a page joins one question of the attempt", () => {
    expect(addScriptPageSchema.safeParse({ questionId: UUID, uploadId: OTHER_UUID }).success).toBe(
      true
    );
    expect(addScriptPageSchema.safeParse({ questionId: UUID }).success).toBe(false);
  });

  test("reordering needs at least one page and caps at thirty", () => {
    expect(reorderScriptPagesSchema.safeParse({ pageIds: [], questionId: UUID }).success).toBe(
      false
    );
    expect(
      reorderScriptPagesSchema.safeParse({
        pageIds: Array.from({ length: 31 }, () => UUID),
        questionId: UUID
      }).success
    ).toBe(false);
  });
});

describe("setAnswerMarkSchema", () => {
  test("half marks pass, negative marks and thirds do not", () => {
    expect(setAnswerMarkSchema.safeParse({ awardedMarks: 2.5 }).success).toBe(true);
    expect(setAnswerMarkSchema.safeParse({ awardedMarks: 0 }).success).toBe(true);
    expect(setAnswerMarkSchema.safeParse({ awardedMarks: -1 }).success).toBe(false);
    expect(setAnswerMarkSchema.safeParse({ awardedMarks: 1.333 }).success).toBe(false);
  });
});
