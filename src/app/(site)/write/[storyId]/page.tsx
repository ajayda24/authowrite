import { ChapterList } from "@/components/writer/chapter-list";
import { PublishStoryBanner } from "@/components/writer/publish-story-banner";
import { getViewer } from "@/server/auth/session";
import { loadOr404 } from "@/server/services/load";
import { getStoryWorkspace } from "@/server/services/stories";

export default async function StoryOverviewPage(props: PageProps<"/write/[storyId]">) {
  const { storyId } = await props.params;
  const viewer = await getViewer();
  const { story, chapters } = await loadOr404(() => getStoryWorkspace(viewer, storyId));
  const publishedChapters = chapters.filter((c) => c.status === "published").length;

  return (
    <div className="space-y-8">
      <PublishStoryBanner
        storyId={story.id}
        status={story.status}
        publishedChapters={publishedChapters}
      />
      <ChapterList storyId={story.id} chapters={chapters} />
    </div>
  );
}
