"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NavLinks } from "./nav-links";
import { ThemePicker } from "./theme-menu";

export function MobileNav({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent aria-describedby={undefined}>
        <SheetTitle className="font-display text-lg font-semibold">Menu</SheetTitle>
        <nav aria-label="Mobile" className="mt-6" onClick={() => setOpen(false)}>
          <NavLinks vertical />
          <div className="mt-6 flex flex-col gap-2 border-t pt-6">
            {signedIn ? (
              <Button asChild>
                <Link href="/dashboard">Write</Link>
              </Button>
            ) : (
              <>
                <Button asChild>
                  <Link href="/sign-up">Start writing</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
              </>
            )}
          </div>
        </nav>
        <div className="mt-auto">
          <p className="mb-2 text-xs text-muted-foreground">Appearance</p>
          <ThemePicker />
        </div>
      </SheetContent>
    </Sheet>
  );
}
