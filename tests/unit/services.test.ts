import { describe, expect, it } from "vitest";
import {
  addChapter,
  deleteChapter,
  getReaderChapter,
  moveChapter,
  publishChapter,
  saveChapter,
} from "@/server/services/chapters";
import { listStories, searchStories } from "@/server/services/discovery";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthenticatedError,
  ValidationError,
} from "@/server/services/errors";
import {
  addComment,
  deleteComment,
  listBookmarks,
  saveReadingProgress,
  setBookmark,
  setFollow,
  setLike,
} from "@/server/services/social";
import {
  createStory,
  getPublicStory,
  getStoryWorkspace,
  listMyStories,
  setStoryStatus,
  updateStory,
} from "@/server/services/stories";
import { getProfile, updateProfile } from "@/server/services/users";
import { createUser, doc } from "../support/factories";

async function publishedStory(title = "The Last Monsoon") {
  const author = await createUser({ username: "ajay", name: "Ajay" });
  const { story, firstChapterId } = await createStory(author, { title });
  await saveChapter(author, firstChapterId, {
    content: doc("The rain came early that year."),
    expectedRevision: 0,
  });
  await publishChapter(author, firstChapterId, { publishStory: true });
  return { author, story, firstChapterId };
}

describe("stories", () => {
  it("creates a draft story with a first chapter", async () => {
    const author = await createUser();
    const { story, firstChapterId } = await createStory(author, { title: "The Last Monsoon" });
    expect(story.status).toBe("draft");
    expect(story.slug).toBe("the-last-monsoon");
    const workspace = await getStoryWorkspace(author, story.id);
    expect(workspace.chapters).toHaveLength(1);
    expect(workspace.chapters[0].id).toBe(firstChapterId);
  });

  it("gives each story of an author a unique slug", async () => {
    const author = await createUser();
    await createStory(author, { title: "Rain" });
    const { story } = await createStory(author, { title: "Rain" });
    expect(story.slug).toBe("rain-2");
  });

  it("requires sign-in and ownership", async () => {
    const author = await createUser();
    const other = await createUser();
    const { story } = await createStory(author, { title: "Mine" });
    await expect(createStory(null, { title: "x" })).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(getStoryWorkspace(other, story.id)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      updateStory(other, story.id, {
        title: "Stolen",
        description: "",
        genreSlug: null,
        language: "en",
        tags: [],
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(getStoryWorkspace(author, "not-a-uuid")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("updates settings and normalizes tags", async () => {
    const author = await createUser();
    const { story } = await createStory(author, { title: "Draft" });
    await updateStory(author, story.id, {
      title: "Monsoon Letters",
      description: "Letters written in the rain.",
      genreSlug: "literary",
      language: "ml",
      tags: ["Rain", "#rain", "Kerala Stories", ""],
    });
    const { story: updated } = await getStoryWorkspace(author, story.id);
    expect(updated.slug).toBe("monsoon-letters");
    expect(updated.language).toBe("ml");
    expect(updated.tags).toEqual(["kerala-stories", "rain"]);
    await expect(
      updateStory(author, story.id, {
        title: "x",
        description: "",
        genreSlug: "nope",
        language: "en",
        tags: [],
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("keeps the URL stable after publishing", async () => {
    const { author, story } = await publishedStory();
    await updateStory(author, story.id, {
      title: "A New Title",
      description: "",
      genreSlug: null,
      language: "en",
      tags: [],
    });
    const { story: updated } = await getStoryWorkspace(author, story.id);
    expect(updated.slug).toBe("the-last-monsoon");
  });

  it("cannot be published without a published chapter", async () => {
    const author = await createUser();
    const { story } = await createStory(author, { title: "Empty" });
    await expect(setStoryStatus(author, story.id, "published")).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("hides drafts from everyone but the author", async () => {
    const author = await createUser({ username: "writer" });
    const reader = await createUser();
    await createStory(author, { title: "Secret" });
    expect(await getPublicStory(reader, "writer", "secret")).toBeNull();
    expect(await getPublicStory(null, "writer", "secret")).toBeNull();
    expect((await getPublicStory(author, "writer", "secret"))?.isOwner).toBe(true);
  });

  it("lists the writer's stories with counts", async () => {
    const { author, story } = await publishedStory();
    await addChapter(author, story.id);
    const mine = await listMyStories(author);
    expect(mine).toHaveLength(1);
    expect(mine[0].chapterCount).toBe(2);
    expect(mine[0].wordCount).toBe(6);
  });
});

describe("chapters", () => {
  it("saves sanitized content and counts words", async () => {
    const author = await createUser();
    const { firstChapterId } = await createStory(author, { title: "S" });
    const saved = await saveChapter(author, firstChapterId, {
      title: "Opening",
      content: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "one two three" }] },
          { type: "iframe" },
        ],
      },
      expectedRevision: 0,
    });
    expect(saved.revision).toBe(1);
    expect(saved.wordCount).toBe(3);
  });

  it("rejects stale saves instead of overwriting", async () => {
    const author = await createUser();
    const { firstChapterId } = await createStory(author, { title: "S" });
    await saveChapter(author, firstChapterId, { content: doc("a"), expectedRevision: 0 });
    await expect(
      saveChapter(author, firstChapterId, { content: doc("b"), expectedRevision: 0 }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("reorders and renumbers chapters", async () => {
    const author = await createUser();
    const { story, firstChapterId } = await createStory(author, { title: "S" });
    const second = await addChapter(author, story.id, { title: "Two" });
    const third = await addChapter(author, story.id);
    expect(third.title).toBe("Chapter 3");
    await moveChapter(author, third.id, "up");
    let { chapters } = await getStoryWorkspace(author, story.id);
    expect(chapters.map((c) => c.id)).toEqual([firstChapterId, third.id, second.id]);
    await deleteChapter(author, firstChapterId);
    ({ chapters } = await getStoryWorkspace(author, story.id));
    expect(chapters.map((c) => [c.id, c.position])).toEqual([
      [third.id, 1],
      [second.id, 2],
    ]);
  });

  it("shows readers only published chapters", async () => {
    const { author, story } = await publishedStory();
    const draft = await addChapter(author, story.id, { title: "Unfinished" });
    const reader = await createUser();

    const first = await getReaderChapter(reader, "ajay", "the-last-monsoon", 1);
    expect(first?.chapter.html).toBe("<p>The rain came early that year.</p>");
    expect(first?.next).toBeNull();
    expect(await getReaderChapter(reader, "ajay", "the-last-monsoon", draft.position)).toBeNull();
    expect(
      await getReaderChapter(author, "ajay", "the-last-monsoon", draft.position),
    ).not.toBeNull();
  });
});

describe("discovery", () => {
  it("lists and searches only discoverable stories", async () => {
    await publishedStory();
    const other = await createUser({ username: "someone" });
    await createStory(other, { title: "Monsoon Draft" });

    const latest = await listStories({ sort: "latest" });
    expect(latest.stories.map((s) => s.title)).toEqual(["The Last Monsoon"]);
    expect(latest.stories[0]).toMatchObject({
      chapterCount: 1,
      wordCount: 6,
      href: "/ajay/the-last-monsoon",
    });

    const results = await searchStories("monsoon");
    expect(results.map((s) => s.title)).toEqual(["The Last Monsoon"]);
    expect(await listStories({ genre: "horror" })).toMatchObject({ stories: [] });
  });

  it("ranks popular stories by recent likes and bookmarks", async () => {
    const { story: a } = await publishedStory("Quiet Story");
    const author2 = await createUser({ username: "second" });
    const { story: b, firstChapterId } = await createStory(author2, { title: "Loud Story" });
    await publishChapter(author2, firstChapterId, { publishStory: true });
    const fan = await createUser();
    await setLike(fan, b.id, true);
    await setBookmark(fan, b.id, true);
    const popular = await listStories({ sort: "popular" });
    expect(popular.stories.map((s) => s.id)).toEqual([b.id, a.id]);
  });
});

describe("social", () => {
  it("likes, bookmarks and follows idempotently", async () => {
    const { author, story } = await publishedStory();
    const reader = await createUser();
    await setLike(reader, story.id, true);
    await setLike(reader, story.id, true);
    await setBookmark(reader, story.id, true);
    await setFollow(reader, author.id, true);

    const page = await getPublicStory(reader, "ajay", "the-last-monsoon");
    expect(page?.stats.likes).toBe(1);
    expect(page?.viewer).toMatchObject({ liked: true, bookmarked: true, followingAuthor: true });
    expect((await listBookmarks(reader)).map((s) => s.id)).toEqual([story.id]);
    expect((await getProfile(reader, "ajay"))?.stats.followers).toBe(1);

    await setBookmark(reader, story.id, false);
    expect(await listBookmarks(reader)).toEqual([]);
    await expect(setFollow(author, author.id, true)).rejects.toBeInstanceOf(ValidationError);
  });

  it("does not allow interacting with private drafts", async () => {
    const author = await createUser();
    const reader = await createUser();
    const { story } = await createStory(author, { title: "Private" });
    await expect(setLike(reader, story.id, true)).rejects.toBeInstanceOf(NotFoundError);
    await expect(addComment(reader, { storyId: story.id, body: "hi" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("lets comment authors and story owners delete comments", async () => {
    const { author, story } = await publishedStory();
    const reader = await createUser();
    const stranger = await createUser();
    const comment = await addComment(reader, { storyId: story.id, body: "Beautiful." });
    await expect(deleteComment(stranger, comment.id)).rejects.toBeInstanceOf(ForbiddenError);
    await deleteComment(author, comment.id);
    await expect(addComment(reader, { storyId: story.id, body: "   " })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("remembers reading progress", async () => {
    const { story, firstChapterId } = await publishedStory();
    const reader = await createUser();
    await saveReadingProgress(reader, {
      storyId: story.id,
      chapterId: firstChapterId,
      percent: 0.5,
    });
    await saveReadingProgress(reader, { storyId: story.id, chapterId: firstChapterId, percent: 2 });
    const page = await getPublicStory(reader, "ajay", "the-last-monsoon");
    expect(page?.viewer?.progress).toEqual({ position: 1, percent: 1 });
  });
});

describe("profiles", () => {
  it("validates and updates the profile", async () => {
    const user = await createUser({ username: "first" });
    await createUser({ username: "taken" });
    await expect(
      updateProfile(user, { name: "A", username: "taken", bio: "" }),
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(
      updateProfile(user, { name: "A", username: "settings", bio: "" }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      updateProfile(user, {
        name: "A",
        username: "first",
        bio: "",
        image: "https://evil.example/x.png",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    await updateProfile(user, { name: "Anna", username: "Anna_Writes", bio: "Hello" });
    const profile = await getProfile(null, "anna_writes");
    expect(profile?.user).toMatchObject({ name: "Anna", bio: "Hello" });
  });
});
