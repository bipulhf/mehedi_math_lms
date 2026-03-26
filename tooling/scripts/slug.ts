const NON_SLUG = /[^a-z0-9]+/gi;
const DEFAULT_MAX_SLUG_LENGTH = 255;

function slugifySegment(value: string): string {
  const base = value
    .trim()
    .toLowerCase()
    .replace(NON_SLUG, "-")
    .replace(/^-+|-+$/g, "");

  return base.length > 0 ? base : "item";
}

function truncateSlugBase(base: string, maxLength: number): string {
  const normalizedBase = base.length > 0 ? base : "item";
  const truncatedBase = normalizedBase.slice(0, maxLength).replace(/-+$/g, "");

  return truncatedBase.length > 0 ? truncatedBase : "item";
}

function buildSerialSlugCandidate(
  value: string,
  duplicateIndex = 1,
  maxLength = DEFAULT_MAX_SLUG_LENGTH
): string {
  const base = truncateSlugBase(slugifySegment(value), maxLength);

  if (duplicateIndex <= 1) {
    return base;
  }

  const suffix = `-${duplicateIndex}`;
  const truncatedBase = truncateSlugBase(base, Math.max(1, maxLength - suffix.length));

  return `${truncatedBase}${suffix}`;
}

export async function generateUniqueSlug(
  value: string,
  isTaken: (candidate: string) => boolean | Promise<boolean>,
  options?: {
    maxLength?: number | undefined;
    startIndex?: number | undefined;
  }
): Promise<string> {
  const maxLength = options?.maxLength ?? DEFAULT_MAX_SLUG_LENGTH;
  let duplicateIndex = options?.startIndex ?? 1;

  while (true) {
    const candidate = buildSerialSlugCandidate(value, duplicateIndex, maxLength);

    if (!(await isTaken(candidate))) {
      return candidate;
    }

    duplicateIndex += 1;
  }
}
