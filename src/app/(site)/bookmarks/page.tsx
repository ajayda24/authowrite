import type { Metadata } from "next";
import Link from "next/link";
import { StoryList } from "@/components/story/story-card";
import { requireViewer } from "@/server/auth/session";
import { listBookmarks } from "@/server/services/social";

export const metadata: Metadata = { title: "Bookmarks" };

export default async function BookmarksPage() {
  const viewer = await requireViewer("/bookmarks");
  const stories = await listBookmarks(viewer);
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-semibold">Bookmarks</h1>
      <p className="text-muted-foreground mt-2">Stories you’ve saved to read later.</p>
      <div className="mt-6 border-t">
        <StoryList
          stories={stories}
          empty={
            <span>
              Nothing saved yet. Tap <strong>Bookmark</strong> on any story to keep it here.{" "}
              <Link href="/explore" className="text-accent underline">
                Find something to read
              </Link>
              .
            </span>
          }
        />
      </div>
    </div>
  );
}
