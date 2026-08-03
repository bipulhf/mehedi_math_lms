/**
 * The shape of a chunked progress tracker, decided once for every client.
 *
 * DESIGN.md asks for chunks rather than a thin line, which means a percentage
 * has to become a whole number of filled blocks. Rounding that number is where a
 * progress bar starts lying — 1 lecture of 30 rounds to zero chunks and reads as
 * "not started", 29 of 30 rounds to full and reads as "done". Both are wrong in
 * the direction that matters, so both are pinned below.
 */

/** Beyond this, chunks are thinner than the gaps between them. */
export const maxProgressChunks = 12;

export interface ProgressChunks {
  /** How many chunks to paint as complete. */
  filled: number;
  /** How many chunks to draw in total. */
  total: number;
}

/**
 * `completed` of `total` units as chunks to draw.
 *
 * A course with few lectures gets one chunk per lecture, which makes the tracker
 * a count rather than an estimate. A long course, or a caller that only has a
 * percentage (`completed` out of 100), is capped at `maxProgressChunks`.
 */
export function resolveProgressChunks(completed: number, total: number): ProgressChunks {
  if (!Number.isFinite(total) || total <= 0) {
    return { filled: 0, total: maxProgressChunks };
  }

  const safeCompleted = Number.isFinite(completed) ? Math.max(0, Math.min(completed, total)) : 0;
  const chunkCount = Math.min(Math.floor(total), maxProgressChunks);
  const filled = Math.round((safeCompleted / total) * chunkCount);

  if (safeCompleted > 0 && filled === 0) {
    // Something was done. An empty tracker would say otherwise.
    return { filled: 1, total: chunkCount };
  }

  if (safeCompleted < total && filled === chunkCount) {
    // Not finished. A full tracker would be the more expensive lie of the two.
    return { filled: chunkCount - 1, total: chunkCount };
  }

  return { filled, total: chunkCount };
}
