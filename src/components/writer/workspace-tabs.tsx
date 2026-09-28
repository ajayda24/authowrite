"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function WorkspaceTabs({ storyId }: { storyId: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/write/${storyId}`, label: "Chapters", exact: true },
    { href: `/write/${storyId}/history`, label: "History", exact: false },
    { href: `/write/${storyId}/settings`, label: "Story details", exact: true },
  ];
  return (
    <nav aria-label="Story workspace" className="mt-6 flex gap-5 border-b text-sm">
      {tabs.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "text-muted-foreground hover:text-foreground -mb-px border-b-2 border-transparent pb-2.5",
              active && "border-foreground text-foreground font-medium",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
