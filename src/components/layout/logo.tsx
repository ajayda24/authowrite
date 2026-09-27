import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "group font-display inline-flex items-baseline gap-1.5 text-[1.35rem] font-semibold",
        className,
      )}
      aria-label="Authowrite home"
    >
      <span aria-hidden="true" className="text-accent translate-y-[1px]">
        ¶
      </span>
      <span>Authowrite</span>
    </Link>
  );
}
