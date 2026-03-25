const NON_SLUG = /[^a-z0-9]+/gi;

export function slugifySegment(value: string): string {
  const base = value
    .trim()
    .toLowerCase()
    .replace(NON_SLUG, "-")
    .replace(/^-+|-+$/g, "");

  return base.length > 0 ? base : "item";
}

export function slugifyWithRandomSuffix(value: string): string {
  const base = slugifySegment(value);
  const c = globalThis.crypto;
  const suffix =
    c !== undefined && "randomUUID" in c ? c.randomUUID().slice(0, 8) : String(Date.now());

  return `${base}-${suffix}`;
}
