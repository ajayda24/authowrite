"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast: "!bg-surface !text-foreground !border-border !rounded-md !shadow-soft !font-sans",
          description: "!text-muted-foreground",
        },
      }}
    />
  );
}
