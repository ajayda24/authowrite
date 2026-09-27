import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FollowButton } from "@/components/social/social-buttons";
import { StoryList } from "@/components/story/story-card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { decodeParam } from "@/lib/params";
import { formatCount, formatDate } from "@/lib/utils";
import { getViewer } from "@/server/auth/session";
import { getProfile } from "@/server/services/users";

export async function generateMetadata(props: PageProps<"/[username]">): Promise<Metadata> {
  const { username } = await props.params;
  const profile = await getProfile(null, decodeParam(username));
  if (!profile) return { title: "Author not found" };
  return {
    title: `${profile.user.name} (@${profile.user.username})`,
    description: profile.user.bio || undefined,
  };
}

export default async function ProfilePage(props: PageProps<"/[username]">) {
  const { username } = await props.params;
  const viewer = await getViewer();
  const profile = await getProfile(viewer, decodeParam(username));
  if (!profile) notFound();
  const { user, stats, stories } = profile;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-6 border-b pb-10 sm:flex-row sm:items-center">
        <Avatar name={user.name} src={user.image} size={88} />
        <div className="flex-1">
          <h1 className="font-display text-4xl font-semibold">{user.name}</h1>
          <p className="text-muted-foreground mt-1">@{user.username}</p>
          {user.bio ? (
            <p className="mt-4 max-w-xl leading-relaxed whitespace-pre-line">{user.bio}</p>
          ) : null}
          <p className="text-muted-foreground mt-4 flex flex-wrap gap-x-5 text-sm">
            <span>
              <strong className="text-foreground font-semibold">
                {formatCount(stats.followers)}
              </strong>{" "}
              followers
            </span>
            <span>
              <strong className="text-foreground font-semibold">
                {formatCount(stats.following)}
              </strong>{" "}
              following
            </span>
            <span>Joined {formatDate(user.createdAt)}</span>
          </p>
        </div>
        {profile.isSelf ? (
          <Button asChild variant="outline">
            <Link href="/settings">Edit profile</Link>
          </Button>
        ) : (
          <FollowButton
            userId={user.id}
            name={user.name}
            following={profile.viewerFollows}
            signedIn={Boolean(viewer)}
          />
        )}
      </header>
      <section aria-labelledby="stories-heading" className="mt-10">
        <h2 id="stories-heading" className="font-display text-2xl font-semibold">
          Stories
        </h2>
        <StoryList
          stories={stories}
          empty={
            profile.isSelf ? (
              <span>
                You haven’t published anything yet.{" "}
                <Link className="text-accent underline" href="/write/new">
                  Start a story
                </Link>
                .
              </span>
            ) : (
              `${user.name} hasn’t published any stories yet.`
            )
          }
        />
      </section>
    </div>
  );
}
