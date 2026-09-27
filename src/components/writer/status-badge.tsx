import { Badge } from "@/components/ui/badge";

const LABELS: Record<string, { label: string; variant: "published" | "draft" | "default" | "accent" }> = {
  draft: { label: "Draft", variant: "draft" },
  published: { label: "Published", variant: "published" },
  unlisted: { label: "Unlisted", variant: "accent" },
  archived: { label: "Archived", variant: "default" },
};

export function StoryStatusBadge({ status }: { status: string }) {
  const { label, variant } = LABELS[status] ?? LABELS.draft;
  return <Badge variant={variant}>{label}</Badge>;
}
