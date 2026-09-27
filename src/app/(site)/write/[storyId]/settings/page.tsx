import { StorySettingsForm } from "@/components/writer/story-settings-form";
import { getViewer } from "@/server/auth/session";
import { loadOr404 } from "@/server/services/load";
import { getStoryWorkspace } from "@/server/services/stories";

export default async function StorySettingsPage(props: PageProps<"/write/[storyId]/settings">) {
  const { storyId } = await props.params;
  const viewer = await getViewer();
  const { story, genres, chapters } = await loadOr404(() => getStoryWorkspace(viewer, storyId));
  return (
    <StorySettingsForm
      story={{
        id: story.id,
        title: story.title,
        description: story.description,
        genreSlug: story.genreSlug,
        language: story.language,
        tags: story.tags,
        status: story.status,
        coverKey: story.coverKey,
        coverUrl: story.coverUrl,
      }}
      genres={genres}
      hasPublishedChapter={chapters.some((c) => c.status === "published")}
    />
  );
}
