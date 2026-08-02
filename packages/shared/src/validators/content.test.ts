import { describe, expect, test } from "bun:test";

import {
  createChapterSchema,
  createLectureSchema,
  createMaterialSchema,
  lectureTypeSchema,
  reorderLecturesSchema,
  updateLectureSchema,
  updateMaterialSchema
} from "./content";

const UUID = "11111111-1111-4111-8111-111111111111";
const OTHER_UUID = "22222222-2222-4222-8222-222222222222";

describe("lectureTypeSchema", () => {
  test("matches the database enum", () => {
    expect(lectureTypeSchema.options).toEqual(["VIDEO_UPLOAD", "VIDEO_LINK", "TEXT"]);
  });
});

describe("createChapterSchema", () => {
  test("needs a title", () => {
    expect(createChapterSchema.safeParse({ title: "   " }).success).toBe(false);
    expect(createChapterSchema.parse({ title: " Chapter 1 " }).title).toBe("Chapter 1");
  });
});

describe("createLectureSchema", () => {
  test("a video lecture without a url is rejected, and says which field", () => {
    const result = createLectureSchema.safeParse({ title: "Intro", type: "VIDEO_LINK" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["videoUrl"]);
  });

  test("a whitespace-only url does not count as a url", () => {
    expect(
      createLectureSchema.safeParse({ title: "Intro", type: "VIDEO_UPLOAD", videoUrl: "   " })
        .success
    ).toBe(false);
  });

  test("a text lecture without content is rejected, and says which field", () => {
    const result = createLectureSchema.safeParse({ title: "Notes", type: "TEXT" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["content"]);
  });

  test("accepts each type when its own required field is present", () => {
    expect(
      createLectureSchema.parse({
        title: "Intro",
        type: "VIDEO_LINK",
        videoUrl: "https://example.com/v.mp4"
      }).isPreview
    ).toBe(false);
    expect(
      createLectureSchema.safeParse({ content: "Some notes", title: "Notes", type: "TEXT" }).success
    ).toBe(true);
  });
});

describe("updateLectureSchema", () => {
  test("refuses an empty patch", () => {
    expect(updateLectureSchema.safeParse({}).success).toBe(false);
  });

  test("does not re-run the type/url pairing, because the patch may not carry the type", () => {
    expect(updateLectureSchema.safeParse({ title: "Renamed" }).success).toBe(true);
  });
});

describe("reorderLecturesSchema", () => {
  test("every item names both the lecture and the chapter it lands in", () => {
    expect(
      reorderLecturesSchema.parse({
        items: [{ chapterId: OTHER_UUID, id: UUID, sortOrder: 0 }]
      }).items
    ).toHaveLength(1);
    expect(
      reorderLecturesSchema.safeParse({ items: [{ id: UUID, sortOrder: 0 }] }).success
    ).toBe(false);
  });

  test("rejects a negative sort order", () => {
    expect(
      reorderLecturesSchema.safeParse({
        items: [{ chapterId: OTHER_UUID, id: UUID, sortOrder: -1 }]
      }).success
    ).toBe(false);
  });
});

describe("createMaterialSchema", () => {
  const material = {
    fileSize: 1024,
    fileType: "application/pdf",
    fileUrl: "https://example.com/notes.pdf",
    title: "Notes"
  };

  test("accepts a material under the 50MB ceiling", () => {
    expect(createMaterialSchema.parse(material).fileSize).toBe(1024);
  });

  test("holds the 50MB ceiling exactly", () => {
    expect(createMaterialSchema.safeParse({ ...material, fileSize: 50 * 1024 * 1024 }).success).toBe(
      true
    );
    expect(
      createMaterialSchema.safeParse({ ...material, fileSize: 50 * 1024 * 1024 + 1 }).success
    ).toBe(false);
  });

  test("refuses a zero-byte file and a url that is not one", () => {
    expect(createMaterialSchema.safeParse({ ...material, fileSize: 0 }).success).toBe(false);
    expect(createMaterialSchema.safeParse({ ...material, fileUrl: "notes.pdf" }).success).toBe(false);
  });
});

describe("updateMaterialSchema", () => {
  test("refuses an empty patch", () => {
    expect(updateMaterialSchema.safeParse({}).success).toBe(false);
  });
});
