"use client";

import { BookmarkIcon, CheckIcon, HeartIcon, Share2Icon, UserPlusIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatCount } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { setBookmarkAction, setFollowAction, setLikeAction } from "@/server/actions/social";

function useSignInRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  return () => router.push(`/sign-in?next=${encodeURIComponent(pathname)}`);
}

export function LikeButton({ storyId, liked, count, signedIn }: { storyId: string; liked: boolean; count: number; signedIn: boolean }) {
  const [state, setOptimistic] = useOptimistic({ liked, count });
  const [, startTransition] = useTransition();
  const toSignIn = useSignInRedirect();
  return (
    <Button
      variant="outline"
      aria-pressed={state.liked}
      aria-label={state.liked ? "Unlike" : "Like"}
      onClick={() => {
        if (!signedIn) return toSignIn();
        const next = !state.liked;
        startTransition(async () => {
          setOptimistic({ liked: next, count: state.count + (next ? 1 : -1) });
          const result = await setLikeAction(storyId, next);
          if (!result.ok) toast.error(result.error);
        });
      }}
    >
      <HeartIcon className={cn(state.liked && "fill-destructive text-destructive")} aria-hidden="true" />
      <span className="tabular-nums">{formatCount(Math.max(0, state.count))}</span>
    </Button>
  );
}

export function BookmarkButton({ storyId, bookmarked, signedIn }: { storyId: string; bookmarked: boolean; signedIn: boolean }) {
  const [state, setOptimistic] = useOptimistic(bookmarked);
  const [, startTransition] = useTransition();
  const toSignIn = useSignInRedirect();
  return (
    <Button
      variant="outline"
      aria-pressed={state}
      onClick={() => {
        if (!signedIn) return toSignIn();
        startTransition(async () => {
          setOptimistic(!state);
          const result = await setBookmarkAction(storyId, !state);
          if (!result.ok) toast.error(result.error);
          else toast.success(!state ? "Saved to your bookmarks." : "Removed from bookmarks.");
        });
      }}
    >
      <BookmarkIcon className={cn(state && "fill-current")} aria-hidden="true" />
      {state ? "Bookmarked" : "Bookmark"}
    </Button>
  );
}

export function FollowButton({
  userId,
  following,
  signedIn,
  name,
  size = "default",
}: {
  userId: string;
  following: boolean;
  signedIn: boolean;
  name: string;
  size?: "default" | "sm";
}) {
  const [state, setOptimistic] = useOptimistic(following);
  const [, startTransition] = useTransition();
  const toSignIn = useSignInRedirect();
  return (
    <Button
      size={size}
      variant={state ? "outline" : "default"}
      aria-pressed={state}
      aria-label={state ? `Unfollow ${name}` : `Follow ${name}`}
      onClick={() => {
        if (!signedIn) return toSignIn();
        startTransition(async () => {
          setOptimistic(!state);
          const result = await setFollowAction(userId, !state);
          if (!result.ok) toast.error(result.error);
        });
      }}
    >
      {state ? <CheckIcon aria-hidden="true" /> : <UserPlusIcon aria-hidden="true" />}
      {state ? "Following" : "Follow"}
    </Button>
  );
}

export function ShareButton({ title, text }: { title: string; text?: string }) {
  return (
    <Button
      variant="ghost"
      onClick={async () => {
        const url = window.location.href;
        if (navigator.share) {
          try {
            await navigator.share({ title, text, url });
            return;
          } catch {
            // Cancelled or unsupported — fall back to copying.
          }
        }
        try {
          await navigator.clipboard.writeText(url);
          toast.success("Link copied.");
        } catch {
          toast.error("Couldn't copy the link.");
        }
      }}
    >
      <Share2Icon aria-hidden="true" /> Share
    </Button>
  );
}
