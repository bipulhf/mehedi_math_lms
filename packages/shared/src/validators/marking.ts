import { z } from "zod";

/**
 * A teacher's Marking over one Script Page.
 *
 * Stored as data rather than burned into the image, so it stays editable and the
 * student's own page is never altered (ADR-0010). Every coordinate is normalised
 * 0-1 against the page, which is what lets the same document render on a
 * thumbnail, a full-screen marking canvas, and a phone.
 *
 * `version` exists so the shape can move: a reader that meets a version it does
 * not know should show the page unmarked rather than guess.
 */
export const markingDocumentVersion = 1;

export const markingColorValues = ["RED", "GREEN", "BLUE", "BLACK"] as const;
export const markingStampValues = ["TICK", "CROSS", "HALF"] as const;
export const markingPenWidthValues = ["THIN", "MEDIUM", "THICK"] as const;

export const markingColorSchema = z.enum(markingColorValues);
export const markingStampSchema = z.enum(markingStampValues);
export const markingPenWidthSchema = z.enum(markingPenWidthValues);

/** A point on the page, 0-1 from the top-left corner. */
const normalisedCoordinateSchema = z.number().min(0).max(1);

const markingPointSchema = z.object({
  x: normalisedCoordinateSchema,
  y: normalisedCoordinateSchema
});

const elementIdSchema = z.string().trim().min(1).max(64);

const strokeElementSchema = z.object({
  color: markingColorSchema,
  id: elementIdSchema,
  kind: z.literal("STROKE"),
  points: z.array(markingPointSchema).min(1).max(2000),
  width: markingPenWidthSchema
});

const stampElementSchema = z.object({
  color: markingColorSchema,
  id: elementIdSchema,
  kind: z.literal("STAMP"),
  /** Height of the stamp as a fraction of the page. */
  size: z.number().min(0.01).max(0.5),
  stamp: markingStampSchema,
  x: normalisedCoordinateSchema,
  y: normalisedCoordinateSchema
});

const noteElementSchema = z.object({
  color: markingColorSchema,
  /** Cap height of the text as a fraction of the page. */
  fontSize: z.number().min(0.005).max(0.2),
  id: elementIdSchema,
  kind: z.literal("NOTE"),
  text: z.string().trim().min(1).max(500),
  x: normalisedCoordinateSchema,
  y: normalisedCoordinateSchema
});

export const markingElementSchema = z.discriminatedUnion("kind", [
  strokeElementSchema,
  stampElementSchema,
  noteElementSchema
]);

export const markingDocumentSchema = z.object({
  elements: z.array(markingElementSchema).max(500),
  version: z.literal(markingDocumentVersion)
});

export const emptyMarkingDocument: MarkingDocument = {
  elements: [],
  version: markingDocumentVersion
};

/**
 * A stored document, which may predate the current version or be corrupt. Used
 * on read: anything unrecognised comes back as an unmarked page rather than
 * failing the request a teacher is in the middle of.
 */
export function readMarkingDocument(value: unknown): MarkingDocument {
  const parsed = markingDocumentSchema.safeParse(value);

  return parsed.success ? parsed.data : emptyMarkingDocument;
}

export type MarkingColor = z.infer<typeof markingColorSchema>;
export type MarkingStamp = z.infer<typeof markingStampSchema>;
export type MarkingPenWidth = z.infer<typeof markingPenWidthSchema>;
export type MarkingElement = z.infer<typeof markingElementSchema>;
export type MarkingDocument = z.infer<typeof markingDocumentSchema>;
