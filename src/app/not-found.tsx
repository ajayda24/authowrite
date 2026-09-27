import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
      <Logo />
      <p className="mt-12 font-display text-6xl text-subtle-foreground">404</p>
      <h1 className="mt-4 font-display text-2xl font-semibold">This page has wandered off.</h1>
      <p className="mt-2 text-muted-foreground">
        It may have been moved, unpublished, or never existed.
      </p>
      <div className="mt-8 flex gap-2">
        <Button asChild><Link href="/explore">Explore stories</Link></Button>
        <Button asChild variant="outline"><Link href="/">Home</Link></Button>
      </div>
    </main>
  );
}
