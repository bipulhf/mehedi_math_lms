import { describe, expect, test } from "bun:test";

import {
  createQuestionSchema,
  createTestSchema,
  gradeSubmissionSchema,
  reorderCourseItemsSchema,
  saveSubmissionAnswersSchema,
  submitTestSchema,
  testTypeSchema,
  updateQuestionSchema,
  updateTestSchema
} from "./tests";

const UUID = "11111111-1111-4111-8111-111111111111";
const OTHER_UUID = "22222222-2222-4222-8222-222222222222";

function mcqQuestion(options: Array<{ isCorrect: boolean; optionText: string }>) {
  return { marks: 5, options, questionText: "2 + 2 = ?", type: "MCQ" as const };
}

describe("testTypeSchema", () => {
  test("matches the database enum", () => {
    expect(testTypeSchema.options).toEqual(["MCQ", "WRITTEN", "MIXED"]);
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
});

describe("updateTestSchema", () => {
  test("refuses an empty patch", () => {
    expect(updateTestSchema.safeParse({}).success).toBe(false);
  });
});

describe("createQuestionSchema", () => {
  test("an MCQ with fewer than two options is rejected", () => {
    const result = createQuestionSchema.safeParse(
      mcqQuestion([{ isCorrect: true, optionText: "4" }])
    );

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["options"]);
  });

  test("an MCQ with no correct option is rejected — otherwise nobody can pass it", () => {
    const result = createQuestionSchema.safeParse(
      mcqQuestion([
        { isCorrect: false, optionText: "3" },
        { isCorrect: false, optionText: "5" }
      ])
    );

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["options"]);
  });

  test("a well-formed MCQ passes", () => {
    expect(
      createQuestionSchema.safeParse(
        mcqQuestion([
          { isCorrect: true, optionText: "4" },
          { isCorrect: false, optionText: "5" }
        ])
      ).success
    ).toBe(true);
  });

  test("a written question needs no options", () => {
    expect(
      createQuestionSchema.safeParse({ marks: 10, questionText: "Prove it.", type: "WRITTEN" })
        .success
    ).toBe(true);
  });

  test("caps options at eight and marks at a hundred", () => {
    expect(
      createQuestionSchema.safeParse(
        mcqQuestion(
          Array.from({ length: 9 }, (_, index) => ({
            isCorrect: index === 0,
            optionText: `Option ${index}`
          }))
        )
      ).success
    ).toBe(false);
    expect(
      createQuestionSchema.safeParse({ marks: 101, questionText: "?", type: "WRITTEN" }).success
    ).toBe(false);
    expect(
      createQuestionSchema.safeParse({ marks: 0, questionText: "?", type: "WRITTEN" }).success
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

  test("an empty submission is allowed — leaving every question blank is an answer", () => {
    expect(submitTestSchema.parse({ answers: [] }).answers).toEqual([]);
  });

  test("an answer must point at a real question id", () => {
    expect(submitTestSchema.safeParse({ answers: [{ questionId: "q1" }] }).success).toBe(false);
  });
});

describe("gradeSubmissionSchema", () => {
  test("awarded marks cannot be negative or exceed a hundred", () => {
    expect(
      gradeSubmissionSchema.safeParse({ answers: [{ answerId: UUID, awardedMarks: -1 }] }).success
    ).toBe(false);
    expect(
      gradeSubmissionSchema.safeParse({ answers: [{ answerId: UUID, awardedMarks: 101 }] }).success
    ).toBe(false);
    expect(
      gradeSubmissionSchema.safeParse({ answers: [{ answerId: UUID, awardedMarks: 0 }] }).success
    ).toBe(true);
  });
});
