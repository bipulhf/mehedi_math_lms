import { describe, expect, test } from "bun:test";

import { commentsQuerySchema, createCommentSchema, updateCommentSchema } from "./comments";
import { createCourseNoticeSchema, updateCourseNoticeSchema } from "./noticeboard";
import { courseProgressParamsSchema, lectureProgressParamsSchema } from "./progress";
import { courseReviewsQuerySchema, createCourseReviewSchema } from "./reviews";
import { ogImageParamsSchema, slugParamsSchema } from "./seo";
import { confirmUploadSchema, createPresignedUploadSchema, uploadPurposeSchema } from "./uploads";

const UUID = "11111111-1111-4111-8111-111111111111";

describe("uploads", () => {
  test("a presign names the file, its type, its size and what it is for", () => {
    expect(
      createPresignedUploadSchema.parse({
        contentType: "image/png",
        fileName: "cover.png",
        fileSize: 2048,
        purpose: "COURSE_COVER"
      }).purpose
    ).toBe("COURSE_COVER");
  });

  test("refuses a zero-byte file and an unknown purpose", () => {
    const base = { contentType: "image/png", fileName: "cover.png", purpose: "COURSE_COVER" };

    expect(createPresignedUploadSchema.safeParse({ ...base, fileSize: 0 }).success).toBe(false);
    expect(
      createPresignedUploadSchema.safeParse({ ...base, fileSize: 1, purpose: "AVATAR" }).success
    ).toBe(false);
  });

  test("the purpose list is closed", () => {
    expect(uploadPurposeSchema.options).toEqual([
      "PROFILE_PHOTO",
      "BUG_SCREENSHOT",
      "COURSE_COVER",
      "COURSE_MATERIAL",
      "LECTURE_VIDEO"
    ]);
  });

  test("confirming an upload needs the upload's id, and video metadata is optional", () => {
    expect(confirmUploadSchema.parse({ uploadId: UUID }).uploadId).toBe(UUID);
    expect(
      confirmUploadSchema.safeParse({ durationInSeconds: 90, height: 720, uploadId: UUID, width: 1280 })
        .success
    ).toBe(true);
    expect(confirmUploadSchema.safeParse({ uploadId: "upload-1" }).success).toBe(false);
    expect(confirmUploadSchema.safeParse({ height: 0, uploadId: UUID }).success).toBe(false);
  });
});

describe("comments", () => {
  test("a comment has content and may reply to another", () => {
    expect(createCommentSchema.parse({ content: " Nice ", parentId: UUID }).content).toBe("Nice");
    expect(createCommentSchema.safeParse({ content: "  " }).success).toBe(false);
    expect(createCommentSchema.safeParse({ content: "a".repeat(2001) }).success).toBe(false);
  });

  test("a reply target is a uuid", () => {
    expect(createCommentSchema.safeParse({ content: "Nice", parentId: "top" }).success).toBe(false);
  });

  test("an edit still has to say something", () => {
    expect(updateCommentSchema.safeParse({ content: "" }).success).toBe(false);
    expect(commentsQuerySchema.parse({})).toEqual({ limit: 10, page: 1 });
  });
});

describe("reviews", () => {
  test("a rating is a whole number from one to five", () => {
    expect(createCourseReviewSchema.parse({ rating: "5" }).rating).toBe(5);
    expect(createCourseReviewSchema.safeParse({ rating: 0 }).success).toBe(false);
    expect(createCourseReviewSchema.safeParse({ rating: 6 }).success).toBe(false);
    expect(createCourseReviewSchema.safeParse({ rating: 4.5 }).success).toBe(false);
  });

  test("the comment is optional and capped", () => {
    expect(createCourseReviewSchema.safeParse({ rating: 4 }).success).toBe(true);
    expect(
      createCourseReviewSchema.safeParse({ comment: "a".repeat(2001), rating: 4 }).success
    ).toBe(false);
    expect(courseReviewsQuerySchema.parse({})).toEqual({ limit: 20, page: 1 });
  });
});

describe("course notices", () => {
  test("a notice is unpinned unless asked for", () => {
    expect(createCourseNoticeSchema.parse({ content: "Class moved.", title: "Schedule" })).toMatchObject(
      { isPinned: false }
    );
  });

  test("both title and content are required, and content stops at 8000", () => {
    expect(createCourseNoticeSchema.safeParse({ content: "", title: "Schedule" }).success).toBe(
      false
    );
    expect(
      createCourseNoticeSchema.safeParse({ content: "a".repeat(8001), title: "Schedule" }).success
    ).toBe(false);
    expect(updateCourseNoticeSchema.safeParse({}).success).toBe(true);
  });
});

describe("path parameters", () => {
  test("progress routes are keyed by uuid", () => {
    expect(courseProgressParamsSchema.safeParse({ courseId: UUID }).success).toBe(true);
    expect(courseProgressParamsSchema.safeParse({ courseId: "algebra" }).success).toBe(false);
    expect(lectureProgressParamsSchema.safeParse({ lectureId: UUID }).success).toBe(true);
  });

  test("public routes are keyed by slug, not uuid", () => {
    expect(slugParamsSchema.parse({ slug: "higher-mathematics" }).slug).toBe("higher-mathematics");
    expect(slugParamsSchema.safeParse({ slug: "" }).success).toBe(false);
    expect(slugParamsSchema.safeParse({ slug: "a".repeat(256) }).success).toBe(false);
  });

  test("an OG image is for a course or a teacher, and nothing else", () => {
    expect(ogImageParamsSchema.safeParse({ slug: "a-course", type: "course" }).success).toBe(true);
    expect(ogImageParamsSchema.safeParse({ slug: "a-course", type: "category" }).success).toBe(false);
  });
});
