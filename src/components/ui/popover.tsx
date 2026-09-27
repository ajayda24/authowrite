"use client";

import { Popover as Primitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/utils";

export const Popover = Primitive.Root;
export const PopoverTrigger = Primitive.Trigger;

export function PopoverContent({
  className,
  sideOffset = 6,
  align = "end",
  ...props
}: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        sideOffset={sideOffset}
        align={align}
        className={cn("z-50 w-72 rounded-md border bg-surface p-4 shadow-soft outline-none", className)}
        {...props}
      />
    </Primitive.Portal>
  );
}
