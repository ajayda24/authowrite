import { Badge } from "@/components/ui/badge";

export type VersionKindValue = "saved" | "published" | "automatic";

const KINDS: Record<
  VersionKindValue,
  { label: string; variant: "published" | "accent" | "default" }
> = {
  published: { label: "Published", variant: "published" },
  saved: { label: "Saved", variant: "accent" },
  automatic: { label: "Backup", variant: "default" },
};

export function VersionKindBadge({ kind }: { kind: VersionKindValue }) {
  const { label, variant } = KINDS[kind];
  return <Badge variant={variant}>{label}</Badge>;
}

/** Fallback description when the writer didn't write one. */
export function defaultVersionMessage(kind: VersionKindValue): string {
  if (kind === "published") return "Published";
  if (kind === "automatic") return "Automatic backup";
  return "Saved version";
}

/** "+120 words", "−40 words" or "no change in length". */
export function wordDelta(before: number, after: number): string {
  const delta = after - before;
  if (delta === 0) return "same length";
  const n = new Intl.NumberFormat("en").format(Math.abs(delta));
  return `${delta > 0 ? "+" : "−"}${n} ${Math.abs(delta) === 1 ? "word" : "words"}`;
}
