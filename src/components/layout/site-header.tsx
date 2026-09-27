import { PenLineIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/server/auth/session";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";
import { UserMenu } from "./user-menu";

export async function SiteHeader() {
  const viewer = await getViewer();
  return (
    <header className="bg-background/92 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 border-b backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden md:block">
          <NavLinks />
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <Button asChild variant="ghost" size="icon" aria-label="Search">
            <Link href="/search">
              <SearchIcon />
            </Link>
          </Button>
          {viewer ? (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link href="/dashboard">
                  <PenLineIcon />
                  Write
                </Link>
              </Button>
              <UserMenu viewer={viewer} />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild className="hidden sm:inline-flex">
                <Link href="/sign-up">Start writing</Link>
              </Button>
            </>
          )}
          <MobileNav signedIn={Boolean(viewer)} />
        </div>
      </div>
    </header>
  );
}
