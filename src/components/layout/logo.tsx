import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-baseline gap-1.5 font-display text-[1.35rem] font-semibold", className)}
      aria-label="Authowrite home"
    >
      <span aria-hidden="true" className="translate-y-[1px] text-accent">
        ¶
      </span>
      <span>Authowrite</span>
    </Link>
  );
}
