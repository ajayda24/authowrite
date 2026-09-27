import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { formatRelative } from "@/lib/utils";
import { listComments } from "@/server/services/social";
import { CommentForm, DeleteCommentButton } from "./comment-form";

export async function Comments({
  storyId,
  chapterId,
  viewerId,
  storyAuthorId,
  path,
}: {
  storyId: string;
  chapterId: string | null;
  viewerId: string | null;
  storyAuthorId: string;
  path: string;
}) {
  const comments = await listComments(storyId, chapterId);
  return (
    <section aria-labelledby="comments-heading" className="space-y-6">
      <h2 id="comments-heading" className="font-display text-2xl font-semibold">
        {comments.length > 0
          ? `${comments.length} ${comments.length === 1 ? "comment" : "comments"}`
          : "Comments"}
      </h2>
      {viewerId ? (
        <CommentForm storyId={storyId} chapterId={chapterId} path={path} />
      ) : (
        <p className="text-muted-foreground rounded-md border px-4 py-3 text-sm">
          <Link
            href={`/sign-in?next=${encodeURIComponent(path)}`}
            className="text-foreground font-medium underline underline-offset-4"
          >
            Sign in
          </Link>{" "}
          to leave a comment.
        </p>
      )}
      {comments.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No comments yet. Be the first to share what you thought.
        </p>
      ) : (
        <ul className="space-y-6">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3">
              <Link href={`/${comment.author.username}`} aria-hidden="true" tabIndex={-1}>
                <Avatar name={comment.author.name} src={comment.author.image} size={32} />
              </Link>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <Link
                    href={`/${comment.author.username}`}
                    className="font-medium hover:underline"
                  >
                    {comment.author.name}
                  </Link>
                  {comment.author.id === storyAuthorId ? (
                    <span className="bg-accent-soft text-accent ml-1.5 rounded-sm px-1 py-px text-[11px] font-medium">
                      Author
                    </span>
                  ) : null}
                  <span className="text-subtle-foreground ml-2">
                    <time dateTime={comment.createdAt.toISOString()}>
                      {formatRelative(comment.createdAt)}
                    </time>
                  </span>
                </p>
                <p className="mt-1 leading-relaxed [overflow-wrap:anywhere] whitespace-pre-line">
                  {comment.body}
                </p>
                {viewerId && (viewerId === comment.author.id || viewerId === storyAuthorId) ? (
                  <DeleteCommentButton commentId={comment.id} path={path} />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
