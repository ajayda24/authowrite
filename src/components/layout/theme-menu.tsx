"use client";

import { MonitorIcon, MoonIcon, ScrollTextIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "sepia", label: "Sepia", icon: ScrollTextIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "Auto", icon: MonitorIcon },
] as const;

const subscribe = () => () => {};

/** Segmented theme picker. */
export function ThemePicker({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn("bg-muted grid grid-cols-4 gap-1 rounded-md p-1", className)}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            className={cn(
              "text-muted-foreground flex flex-col items-center gap-1 rounded-sm px-1 py-1.5 text-[11px] transition-colors",
              active ? "bg-surface text-foreground shadow-sm" : "hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
