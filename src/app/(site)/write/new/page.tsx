import type { Metadata } from "next";
import { NewStoryForm } from "@/components/writer/new-story-form";
import { requireViewer } from "@/server/auth/session";

export const metadata: Metadata = { title: "Start a story" };

export default async function NewStoryPage() {
  await requireViewer("/write/new");
  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:py-24">
      <h1 className="font-display text-4xl font-semibold">What’s your story called?</h1>
      <p className="text-muted-foreground mt-3">
        A working title is fine — you can change it any time. Next, you’ll be taken straight to your
        first chapter.
      </p>
      <NewStoryForm />
    </div>
  );
}
