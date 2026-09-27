"use client";

import { XIcon } from "lucide-react";
import { Dialog as Primitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/utils";

export const Sheet = Primitive.Root;
export const SheetTrigger = Primitive.Trigger;
export const SheetClose = Primitive.Close;
export const SheetTitle = Primitive.Title;

export function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: React.ComponentProps<typeof Primitive.Content> & { side?: "left" | "right" }) {
  return (
    <Primitive.Portal>
      <Primitive.Overlay className="fixed inset-0 z-50 bg-black/40" />
      <Primitive.Content
        className={cn(
          "border-border bg-background shadow-soft fixed inset-y-0 z-50 flex w-[min(20rem,85vw)] flex-col p-5 focus:outline-none",
          side === "right" ? "right-0 border-l" : "left-0 border-r",
          className,
        )}
        {...props}
      >
        {children}
        <Primitive.Close
          className="text-muted-foreground hover:text-foreground absolute top-4 right-4 rounded-sm p-1"
          aria-label="Close"
        >
          <XIcon className="size-4" />
        </Primitive.Close>
      </Primitive.Content>
    </Primitive.Portal>
  );
}
