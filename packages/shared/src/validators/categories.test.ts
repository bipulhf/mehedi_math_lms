import { describe, expect, test } from "bun:test";

import {
  categoriesQuerySchema,
  categoryIdParamsSchema,
  createCategorySchema,
  reorderCategoriesSchema,
  updateCategorySchema
} from "./categories";

const UUID = "11111111-1111-4111-8111-111111111111";
const OTHER_UUID = "22222222-2222-4222-8222-222222222222";

describe("createCategorySchema", () => {
  test("a new category is active and first in order unless told otherwise", () => {
    expect(createCategorySchema.parse({ name: "HSC Maths" })).toMatchObject({
      isActive: true,
      sortOrder: 0
    });
  });

  test("requires a name that survives trimming", () => {
    expect(createCategorySchema.safeParse({ name: "   " }).success).toBe(false);
    expect(createCategorySchema.parse({ name: "  HSC Maths  " }).name).toBe("HSC Maths");
  });

  test("a parent is a uuid, and an empty string means top level", () => {
    expect(createCategorySchema.safeParse({ name: "Calculus", parentId: UUID }).success).toBe(true);
    expect(createCategorySchema.safeParse({ name: "Calculus", parentId: "" }).success).toBe(true);
    expect(createCategorySchema.safeParse({ name: "Calculus", parentId: "maths" }).success).toBe(
      false
    );
  });

  test("refuses a negative sort order", () => {
    expect(createCategorySchema.safeParse({ name: "Calculus", sortOrder: -1 }).success).toBe(false);
  });
});

describe("updateCategorySchema", () => {
  test("every field is optional, but a supplied name still has to be one", () => {
    expect(updateCategorySchema.safeParse({}).success).toBe(true);
    expect(updateCategorySchema.safeParse({ name: "" }).success).toBe(false);
  });
});

describe("reorderCategoriesSchema", () => {
  test("each item carries an id and its new position", () => {
    expect(
      reorderCategoriesSchema.parse({
        items: [
          { id: UUID, parentId: "", sortOrder: 0 },
          { id: OTHER_UUID, parentId: UUID, sortOrder: 1 }
        ]
      }).items
    ).toHaveLength(2);
  });

  test("rejects an item without a sort order", () => {
    expect(reorderCategoriesSchema.safeParse({ items: [{ id: UUID }] }).success).toBe(false);
  });
});

describe("categoriesQuerySchema", () => {
  test("returns the tree, active only, by default", () => {
    expect(categoriesQuerySchema.parse({})).toEqual({ flat: false, includeInactive: false });
  });

  test("a flag turned off in the URL stays off", () => {
    // Under z.coerce.boolean() every one of these read as true, because that
    // is Boolean(input). ?flat=false meant flat.
    expect(categoriesQuerySchema.parse({ flat: "false", includeInactive: "false" })).toEqual({
      flat: false,
      includeInactive: false
    });
  });

  test("a flag turned on in the URL reads as on", () => {
    expect(categoriesQuerySchema.parse({ flat: "true", includeInactive: "1" })).toEqual({
      flat: true,
      includeInactive: true
    });
  });

  test("a value that means nothing is rejected rather than guessed", () => {
    expect(categoriesQuerySchema.safeParse({ flat: "maybe" }).success).toBe(false);
  });
});

describe("categoryIdParamsSchema", () => {
  test("guards the path parameter", () => {
    expect(categoryIdParamsSchema.safeParse({ id: "hsc-maths" }).success).toBe(false);
  });
});
