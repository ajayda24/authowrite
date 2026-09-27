import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const relativeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

/** "3 days ago", falling back to a date after a month. */
export function formatRelative(date: Date | string, now = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.round((d.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return "just now";
  if (abs < 60 * 45) return relativeFormatter.format(Math.round(seconds / 60), "minute");
  if (abs < 60 * 60 * 22) return relativeFormatter.format(Math.round(seconds / 3600), "hour");
  if (abs < 60 * 60 * 24 * 26) return relativeFormatter.format(Math.round(seconds / 86400), "day");
  return dateFormatter.format(d);
}

export function formatDate(date: Date | string): string {
  return dateFormatter.format(typeof date === "string" ? new Date(date) : date);
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function pluralize(n: number, singular: string, plural = `${singular}s`): string {
  return `${formatCount(n)} ${n === 1 ? singular : plural}`;
}
