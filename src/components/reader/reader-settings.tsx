"use client";

import { MinusIcon, PlusIcon, TypeIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { ThemePicker } from "@/components/layout/theme-menu";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Prefs {
  size: number;
  font: "serif" | "sans";
  width: "narrow" | "normal" | "wide";
}

const SIZES = [16, 17, 19, 21, 23, 26];
const DEFAULTS: Prefs = { size: 2, font: "serif", width: "normal" };
const WIDTHS = { narrow: "34rem", normal: "40rem", wide: "48rem" };
const STORAGE_KEY = "authowrite:reader";

function apply(targetId: string, prefs: Prefs) {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.style.setProperty("--story-size", `${SIZES[prefs.size] / 16}rem`);
  el.dataset.font = prefs.font;
  el.style.maxWidth = WIDTHS[prefs.width];
}

function load(): Prefs {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

/** Typography controls for the reader, remembered on this device. */
export function ReaderSettings({ targetId }: { targetId: string }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  useEffect(() => {
    const stored = load();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage after hydration
    setPrefs(stored);
    apply(targetId, stored);
  }, [targetId]);

  function update(next: Partial<Prefs>) {
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    apply(targetId, merged);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {}
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Reading settings">
          <TypeIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="space-y-5">
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-medium">Text size</p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Smaller text"
              disabled={prefs.size === 0}
              onClick={() => update({ size: prefs.size - 1 })}
            >
              <MinusIcon />
            </Button>
            <div className="flex flex-1 justify-center gap-1" aria-hidden="true">
              {SIZES.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "bg-border h-1.5 w-4 rounded-full",
                    i <= prefs.size && "bg-foreground",
                  )}
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Larger text"
              disabled={prefs.size === SIZES.length - 1}
              onClick={() => update({ size: prefs.size + 1 })}
            >
              <PlusIcon />
            </Button>
          </div>
        </div>
        <Segmented
          label="Font"
          value={prefs.font}
          options={[
            { value: "serif", label: "Serif", className: "font-display" },
            { value: "sans", label: "Sans", className: "font-sans" },
          ]}
          onChange={(font) => update({ font })}
        />
        <Segmented
          label="Line width"
          value={prefs.width}
          options={[
            { value: "narrow", label: "Narrow" },
            { value: "normal", label: "Normal" },
            { value: "wide", label: "Wide" },
          ]}
          onChange={(width) => update({ width })}
        />
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-medium">Theme</p>
          <ThemePicker />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; className?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <p className="text-muted-foreground mb-2 text-xs font-medium" id={`seg-${label}`}>
        {label}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={`seg-${label}`}
        className="bg-muted flex gap-1 rounded-md p-1"
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "text-muted-foreground flex-1 rounded-sm py-1 text-sm",
              option.className,
              value === option.value && "bg-surface text-foreground shadow-sm",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
