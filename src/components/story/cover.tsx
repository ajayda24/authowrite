import { cn } from "@/lib/utils";

/** Muted, bookish colours for generated covers. */
const PALETTE = [
  ["#2d3e50", "#e9e2d0"],
  ["#5b3a29", "#f1e6d2"],
  ["#2f4a3a", "#e6ecdf"],
  ["#4a2f45", "#efe2ea"],
  ["#1f3b5a", "#dfe8f2"],
  ["#6b4b1f", "#f5ead3"],
  ["#3d3d3d", "#ecebe7"],
  ["#553041", "#f3e4e8"],
] as const;

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * A story cover. Uses the uploaded image when there is one; otherwise draws
 * a typographic cover so every story looks intentional.
 */
export function StoryCover({
  title,
  author,
  src,
  seed,
  className,
  size = "md",
}: {
  title: string;
  author?: string;
  src?: string | null;
  seed: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const base = cn(
    "relative aspect-[2/3] shrink-0 overflow-hidden rounded-[3px] shadow-[0_1px_2px_rgb(0_0_0/0.12),0_2px_8px_rgb(0_0_0/0.06)] ring-1 ring-black/5",
    className,
  );
  if (src) {
    return (
      <div className={base}>
        {/* eslint-disable-next-line @next/next/no-img-element -- served by our file route */}
        <img src={src} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
      </div>
    );
  }
  const [bg, fg] = PALETTE[hash(seed) % PALETTE.length];
  return (
    <div className={base} style={{ background: bg, color: fg }} aria-hidden="true">
      <div className="absolute inset-[6%] flex flex-col border border-current/25 p-[8%]">
        <span
          className={cn(
            "font-display leading-[1.15] font-medium [overflow-wrap:break-word] hyphens-auto",
            size === "sm" && "line-clamp-5 text-[11px]",
            size === "md" && "line-clamp-5 text-sm",
            size === "lg" && "line-clamp-6 text-2xl",
          )}
        >
          {title}
        </span>
        {author && size !== "sm" ? (
          <span
            className={cn("mt-auto truncate opacity-75", size === "lg" ? "text-sm" : "text-[10px]")}
          >
            {author}
          </span>
        ) : null}
      </div>
    </div>
  );
}
