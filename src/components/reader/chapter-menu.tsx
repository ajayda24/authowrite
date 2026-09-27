"use client";

import { ListIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function ChapterMenu({
  base,
  current,
  chapters,
}: {
  base: string;
  current: number;
  chapters: { id: string; position: number; title: string; status: string }[];
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Chapters">
          <ListIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-h-[70vh] w-80 overflow-y-auto p-2">
        <p className="text-muted-foreground px-2 pt-1 pb-2 text-xs font-medium">Chapters</p>
        <ol>
          {chapters.map((c) => (
            <li key={c.id}>
              <Link
                href={`${base}/${c.position}`}
                aria-current={c.position === current ? "page" : undefined}
                className={cn(
                  "hover:bg-muted flex gap-3 rounded-sm px-2 py-1.5 text-sm",
                  c.position === current && "bg-muted font-medium",
                )}
              >
                <span className="text-subtle-foreground w-5 text-right tabular-nums">
                  {c.position}
                </span>
                <span className="flex-1 truncate">{c.title || `Chapter ${c.position}`}</span>
                {c.status === "draft" ? (
                  <span className="text-subtle-foreground text-xs">Draft</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ol>
      </PopoverContent>
    </Popover>
  );
}
