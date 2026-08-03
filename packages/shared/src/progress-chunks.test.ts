import { describe, expect, test } from "bun:test";

import { maxProgressChunks, resolveProgressChunks } from "./progress-chunks";

describe("resolveProgressChunks", () => {
  test("a short course gets one chunk per lecture, so the tracker is a count", () => {
    expect(resolveProgressChunks(3, 8)).toEqual({ filled: 3, total: 8 });
  });

  test("a long course is capped, because thinner chunks than gaps stop reading as chunks", () => {
    expect(resolveProgressChunks(15, 30)).toEqual({ filled: 6, total: maxProgressChunks });
  });

  test("a percentage is just completed out of 100", () => {
    expect(resolveProgressChunks(50, 100)).toEqual({ filled: 6, total: maxProgressChunks });
    expect(resolveProgressChunks(0, 100)).toEqual({ filled: 0, total: maxProgressChunks });
    expect(resolveProgressChunks(100, 100)).toEqual({
      filled: maxProgressChunks,
      total: maxProgressChunks
    });
  });

  test("some progress never rounds down to nothing", () => {
    // 1 of 30 is 0.4 chunks. Rounding it away tells a student who has started
    // that they have not.
    expect(resolveProgressChunks(1, 30)).toEqual({ filled: 1, total: maxProgressChunks });
  });

  test("nearly done never rounds up to done", () => {
    expect(resolveProgressChunks(29, 30)).toEqual({
      filled: maxProgressChunks - 1,
      total: maxProgressChunks
    });
  });

  test("only actually finished fills every chunk", () => {
    expect(resolveProgressChunks(30, 30)).toEqual({
      filled: maxProgressChunks,
      total: maxProgressChunks
    });
    expect(resolveProgressChunks(8, 8)).toEqual({ filled: 8, total: 8 });
  });

  test("nothing done leaves the track empty", () => {
    expect(resolveProgressChunks(0, 8)).toEqual({ filled: 0, total: 8 });
  });

  test("a course with no lectures draws an empty track rather than dividing by zero", () => {
    expect(resolveProgressChunks(0, 0)).toEqual({ filled: 0, total: maxProgressChunks });
    expect(resolveProgressChunks(5, -1)).toEqual({ filled: 0, total: maxProgressChunks });
  });

  test("counts outside the range are clamped rather than overflowing the track", () => {
    expect(resolveProgressChunks(12, 8)).toEqual({ filled: 8, total: 8 });
    expect(resolveProgressChunks(-3, 8)).toEqual({ filled: 0, total: 8 });
  });

  test("junk numbers do not produce NaN chunks", () => {
    expect(resolveProgressChunks(Number.NaN, 10)).toEqual({ filled: 0, total: 10 });
    expect(resolveProgressChunks(5, Number.NaN)).toEqual({ filled: 0, total: maxProgressChunks });
  });
});
