import type { Metadata } from "next";
import { ChapterEditor } from "@/components/editor/chapter-editor";
import type { DocNode } from "@/lib/content/types";
import { requireViewer } from "@/server/auth/session";
import { getChapterForEditor } from "@/server/services/chapters";
import { loadOr404 } from "@/server/services/load";

export const metadata: Metadata = { title: "Writing" };

export default async function ChapterEditorPage(
  props: PageProps<"/write/[storyId]/chapters/[chapterId]">,
) {
  const { storyId, chapterId } = await props.params;
  const path = `/write/${storyId}/chapters/${chapterId}`;
  const viewer = await requireViewer(path);
  const { chapter, story, authorUsername } = await loadOr404(
    () => getChapterForEditor(viewer, chapterId),
    path,
  );

  return (
    <ChapterEditor
      key={`${chapter.id}:${chapter.revision}`}
      chapter={{
        id: chapter.id,
        title: chapter.title,
        content: chapter.content as DocNode,
        revision: chapter.revision,
        status: chapter.status,
        position: chapter.position,
      }}
      story={{ id: story.id, title: story.title, status: story.status, language: story.language }}
      readerHref={`/${authorUsername}/${story.slug}/${chapter.position}`}
    />
  );
}
