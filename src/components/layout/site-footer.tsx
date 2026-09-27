import Link from "next/link";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo className="text-lg" />
          <p className="text-muted-foreground max-w-sm leading-relaxed">
            Your story belongs to you. Authowrite is open source and can be hosted by anyone.
          </p>
        </div>
        <nav aria-label="Discover">
          <p className="mb-2 font-medium">Discover</p>
          <ul className="text-muted-foreground space-y-1.5">
            <li>
              <Link className="hover:text-foreground" href="/explore">
                Explore
              </Link>
            </li>
            <li>
              <Link className="hover:text-foreground" href="/explore?sort=popular">
                Popular
              </Link>
            </li>
            <li>
              <Link className="hover:text-foreground" href="/search">
                Search
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Project">
          <p className="mb-2 font-medium">Project</p>
          <ul className="text-muted-foreground space-y-1.5">
            <li>
              <Link className="hover:text-foreground" href="/about">
                About
              </Link>
            </li>
            <li>
              <a className="hover:text-foreground" href="https://github.com/ajayda24/authowrite">
                Source code
              </a>
            </li>
            <li>
              <a
                className="hover:text-foreground"
                href="https://github.com/ajayda24/authowrite/blob/main/docs/self-hosting.md"
              >
                Self-hosting
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
