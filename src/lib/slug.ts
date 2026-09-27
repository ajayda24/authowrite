const MAX_SLUG_LENGTH = 80;

/**
 * Turns a title into a URL slug. Letters from any script are kept (so a
 * Malayalam title produces a Malayalam slug); everything else becomes "-".
 */
export function slugify(input: string): string {
  const slug = input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");
  return slug || "untitled";
}

/** Appends -2, -3, … until `isTaken` returns false. */
export async function uniqueSlug(
  base: string,
  isTaken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  let candidate = base;
  for (let i = 2; await isTaken(candidate); i++) {
    const suffix = `-${i}`;
    candidate = `${base.slice(0, MAX_SLUG_LENGTH - suffix.length)}${suffix}`;
  }
  return candidate;
}
