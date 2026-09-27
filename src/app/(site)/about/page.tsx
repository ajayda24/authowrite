import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <p className="text-sm font-medium tracking-wide text-accent uppercase">About Authowrite</p>
      <h1 className="mt-3 font-display text-4xl leading-tight font-semibold sm:text-5xl">Your story belongs to you.</h1>
      <div className="story-prose mt-10">
        <p>
          Authowrite is an open-source place to write, publish and discover stories. It is built for
          writers who want a beautiful, quiet tool — and for readers who want to get lost in a good
          story without distractions.
        </p>
        <h2>What we believe</h2>
        <ul>
          <li><strong>Writers own their work.</strong> Your words are stored in an open format and will always be exportable.</li>
          <li><strong>Attribution matters.</strong> Who wrote what stays clear and visible.</li>
          <li><strong>No lock-in.</strong> Anyone can run their own Authowrite, and move their stories between instances.</li>
          <li><strong>Calm by design.</strong> No ads, no dark patterns, no algorithmic feeds pushing you around.</li>
          <li><strong>AI is optional.</strong> Any AI assistance will always be opt-in and clearly disclosed.</li>
        </ul>
        <h2>What’s coming</h2>
        <p>
          Under the hood, Authowrite is designed like a version-controlled project — the same ideas
          that let software developers collaborate. Soon you’ll be able to see a story’s history,
          write alternate endings, invite co-writers and translators, and remix stories whose authors
          allow it. You won’t need to learn any technical words to use it.
        </p>
        <h2>Open source</h2>
        <p>
          Authowrite is free software licensed under the AGPL-3.0. Read the code, report issues or
          contribute on <a href="https://github.com/ajayda24/authowrite">GitHub</a>, or learn how to{" "}
          <a href="https://github.com/ajayda24/authowrite/blob/main/docs/self-hosting.md">host your own instance</a>.
        </p>
      </div>
      <p className="mt-12">
        <Link href="/sign-up" className="font-medium text-accent underline underline-offset-4">Start writing →</Link>
      </p>
    </article>
  );
}
