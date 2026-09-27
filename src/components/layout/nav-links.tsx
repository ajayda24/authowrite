"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const MAIN_LINKS = [
  { href: "/explore", label: "Explore" },
  { href: "/explore?sort=popular", label: "Popular" },
  { href: "/about", label: "About" },
];

export function NavLinks({ vertical = false }: { vertical?: boolean }) {
  const pathname = usePathname();
  return (
    <ul className={cn("flex gap-1", vertical ? "flex-col" : "items-center")}>
      {MAIN_LINKS.map((link) => {
        const active = pathname === link.href.split("?")[0] && !link.href.includes("?");
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "text-muted-foreground hover:text-foreground block rounded-md px-2.5 py-1.5 text-sm transition-colors",
                active && "text-foreground",
                vertical && "px-0 py-2 text-base",
              )}
            >
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
