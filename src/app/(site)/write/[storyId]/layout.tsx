import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { StoryStatusBadge } from "@/components/writer/status-badge";
import { WorkspaceTabs } from "@/components/writer/workspace-tabs";
import { getViewer } from "@/server/auth/session";
import { loadOr404 } from "@/server/services/load";
import { getStoryWorkspace } from "@/server/services/stories";

export default async function StoryWorkspaceLayout(props: LayoutProps<"/write/[storyId]">) {
  const { storyId } = await props.params;
  const viewer = await getViewer();
  const { story, authorUsername } = await loadOr404(() => getStoryWorkspace(viewer, storyId), `/write/${storyId}`);
  const publicHref = `/${authorUsername}/${story.slug}`;

  return (
    <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground">Your stories</Link>
        <span aria-hidden="true" className="mx-2">/</span>
      </nav>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">{story.title}</h1>
        <StoryStatusBadge status={story.status} />
        <Link href={publicHref} className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          {story.status === "published" || story.status === "unlisted" ? "View story" : "Preview"}
          <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
      <WorkspaceTabs storyId={story.id} />
      <div className="py-8">{props.children}</div>
    </div>
  );
}
