import { describe, expect, test } from "bun:test";

import {
  emptyMarkingDocument,
  markingDocumentSchema,
  markingDocumentVersion,
  readMarkingDocument
} from "./marking";

function stroke(points: Array<{ x: number; y: number }>) {
  return {
    elements: [{ color: "RED", id: "s1", kind: "STROKE", points, width: "MEDIUM" }],
    version: markingDocumentVersion
  };
}

describe("markingDocumentSchema", () => {
  test("coordinates are normalised, so anything off the page is rejected", () => {
    expect(markingDocumentSchema.safeParse(stroke([{ x: 0.5, y: 0.5 }])).success).toBe(true);
    expect(markingDocumentSchema.safeParse(stroke([{ x: 1.2, y: 0.5 }])).success).toBe(false);
    expect(markingDocumentSchema.safeParse(stroke([{ x: -0.1, y: 0.5 }])).success).toBe(false);
  });

  test("a stroke needs at least one point and is capped", () => {
    expect(markingDocumentSchema.safeParse(stroke([])).success).toBe(false);
    expect(
      markingDocumentSchema.safeParse(stroke(Array.from({ length: 2001 }, () => ({ x: 0.5, y: 0.5 }))))
        .success
    ).toBe(false);
  });

  test("stamps and notes are the other two element kinds", () => {
    const document = {
      elements: [
        { color: "GREEN", id: "t1", kind: "STAMP", size: 0.05, stamp: "TICK", x: 0.2, y: 0.3 },
        { color: "RED", id: "n1", fontSize: 0.02, kind: "NOTE", text: "check step 3", x: 0.4, y: 0.6 }
      ],
      version: markingDocumentVersion
    };

    expect(markingDocumentSchema.safeParse(document).success).toBe(true);
  });

  test("an unknown element kind is rejected rather than stored blind", () => {
    expect(
      markingDocumentSchema.safeParse({
        elements: [{ id: "h1", kind: "HIGHLIGHT", x: 0.1, y: 0.1 }],
        version: markingDocumentVersion
      }).success
    ).toBe(false);
  });
});

describe("readMarkingDocument", () => {
  test("a stored document from a future version reads as unmarked, not as an error", () => {
    expect(readMarkingDocument({ elements: [], version: 99 })).toEqual(emptyMarkingDocument);
    expect(readMarkingDocument(null)).toEqual(emptyMarkingDocument);
    expect(readMarkingDocument("nonsense")).toEqual(emptyMarkingDocument);
  });

  test("a valid document survives the round trip", () => {
    const document = stroke([{ x: 0.1, y: 0.2 }]);

    expect(readMarkingDocument(document)).toEqual(markingDocumentSchema.parse(document));
  });
});
