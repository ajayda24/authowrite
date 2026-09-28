import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { contentBlobs } from "@/server/db/schema";
import {
  addChapter,
  deleteChapter,
  getReaderChapter,
  publishChapter,
  saveChapter,
  setChapterStatus,
} from "@/server/services/chapters";
import { ForbiddenError, NotFoundError } from "@/server/services/errors";
import {
  compareVersions,
  getVersion,
  listPublishedVersions,
  listVersions,
  restoreChapter,
  restoreVersion,
  saveVersion,
} from "@/server/services/history";
import {
  createStory,
  getPublicStory,
  getStoryWorkspace,
  updateStory,
} from "@/server/services/stories";
import { listStories } from "@/server/services/discovery";
import { createUser, doc } from "../support/factories";

async function setup() {
  const author = await createUser({ username: "meera", name: "Meera" });
  const { story, firstChapterId } = await createStory(author, { title: "The Last Monsoon" });
  let revision = 0;
  async function write(text: string, chapterId = firstChapterId) {
    const saved = await saveChapter(author, chapterId, {
      content: doc(text),
      expectedRevision: chapterId === firstChapterId ? revision : 0,
    });
    if (chapterId === firstChapterId) revision = saved.revision;
    return saved;
  }
  return { author, story, firstChapterId, write };
}

describe("publishing and what readers see", () => {
  it("records a published version and keeps later edits private until republished", async () => {
    const { author, story, firstChapterId, write } = await setup();
    await write("First draft of the rain.");
    await publishChapter(author, firstChapterId, {
      publishStory: true,
      message: "First chapter is out",
    });

    await write("Second draft, much better rain.");
    const reader = await createUser();
    const seen = await getReaderChapter(reader, "meera", "the-last-monsoon", 1);
    expect(seen?.chapter.html).toBe("<p>First draft of the rain.</p>");
    const preview = await getReaderChapter(author, "meera", "the-last-monsoon", 1);
    expect(preview?.chapter.html).toBe("<p>Second draft, much better rain.</p>");
    expect(preview?.previewingDraft).toBe(true);

    const workspace = await getStoryWorkspace(author, story.id);
    expect(workspace.chapters[0].hasUnpublishedChanges).toBe(true);

    await publishChapter(author, firstChapterId, { publishStory: false });
    expect((await getReaderChapter(reader, "meera", "the-last-monsoon", 1))?.chapter.html).toBe(
      "<p>Second draft, much better rain.</p>",
    );

    const versions = await listVersions(author, story.id);
    expect(versions.map((v) => [v.number, v.kind, v.message])).toEqual([
      [2, "published", "Updated “Chapter 1”"],
      [1, "published", "First chapter is out"],
    ]);
    expect(versions[0].author?.name).toBe("Meera");
  });

  it("uses published word counts in discovery", async () => {
    const { author, firstChapterId, write } = await setup();
    await write("one two three");
    await publishChapter(author, firstChapterId, { publishStory: true });
    await write("one two three four five six");
    const { stories } = await listStories();
    expect(stories[0].wordCount).toBe(3);
  });

  it("publishes from the chapter list through the same path", async () => {
    const { author, story, firstChapterId, write } = await setup();
    await write("Text");
    await setChapterStatus(author, firstChapterId, "published");
    expect((await listVersions(author, story.id))[0].kind).toBe("published");
  });
});

describe("saving and viewing versions", () => {
  it("snapshots drafts and stores each unique text once", async () => {
    const { author, story, write } = await setup();
    await write("Unchanged opening.");
    await addChapter(author, story.id, { title: "Two" });
    await saveVersion(author, story.id, "Before the big rewrite");
    await saveVersion(author, story.id, "");
    const blobCount = (await db.select().from(contentBlobs)).length;
    expect(blobCount).toBe(2); // chapter 1 text + empty chapter 2, shared by both versions

    const version = await getVersion(author, story.id, 1);
    expect(version.version).toMatchObject({
      number: 1,
      kind: "saved",
      message: "Before the big rewrite",
      chapterCount: 2,
    });
    expect(version.chapters[0].html).toBe("<p>Unchanged opening.</p>");
    expect(version.chapters[1]).toMatchObject({ title: "Two", status: "draft" });
  });

  it("only lets the author see the history", async () => {
    const { story } = await setup();
    const other = await createUser();
    await expect(listVersions(other, story.id)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(getVersion(other, story.id, 1)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("returns not found for missing versions", async () => {
    const { author, story } = await setup();
    await expect(getVersion(author, story.id, 99)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("comparing versions", () => {
  it("compares a version with the current draft", async () => {
    const { author, story, firstChapterId, write } = await setup();
    await write("The rain came early.");
    await saveVersion(author, story.id);
    await write("The rain came early that year, and stayed.");
    await addChapter(author, story.id, { title: "Letters" });
    await updateStory(author, story.id, {
      title: "Monsoon Letters",
      description: "",
      genreSlug: null,
      language: "en",
      tags: ["rain"],
    });

    const diff = await compareVersions(author, story.id, 1, "current");
    expect(diff.chapters.map((c) => [c.title, c.change])).toEqual([
      ["Chapter 1", "edited"],
      ["Letters", "added"],
    ]);
    expect(diff.meta.map((m) => m.field)).toEqual(["title", "tags"]);
    expect(diff.chapters[0].id).toBe(firstChapterId);
  });
});

describe("restoring", () => {
  it("restores the whole story and keeps an automatic backup", async () => {
    const { author, story, firstChapterId, write } = await setup();
    await write("Original ending.");
    await updateStory(author, story.id, {
      title: "The Last Monsoon",
      description: "Old blurb",
      genreSlug: "literary",
      language: "en",
      tags: ["rain"],
    });
    await saveVersion(author, story.id, "Good version");

    await write("Terrible new ending.");
    const extra = await addChapter(author, story.id, { title: "Mistake" });
    await updateStory(author, story.id, {
      title: "The Last Monsoon",
      description: "New blurb",
      genreSlug: null,
      language: "en",
      tags: [],
    });

    const { backupNumber } = await restoreVersion(author, story.id, 1);
    expect(backupNumber).toBe(2);

    const workspace = await getStoryWorkspace(author, story.id);
    expect(workspace.chapters.map((c) => c.id)).toEqual([firstChapterId]);
    expect(workspace.story).toMatchObject({
      description: "Old blurb",
      genreSlug: "literary",
      tags: ["rain"],
    });
    const restored = await getReaderChapter(author, "meera", "the-last-monsoon", 1);
    expect(restored?.chapter.html).toBe("<p>Original ending.</p>");

    // The backup holds what was there before, so the restore can be undone.
    const backup = await getVersion(author, story.id, 2);
    expect(backup.version.kind).toBe("automatic");
    expect(backup.chapters.map((c) => c.title)).toEqual(["Chapter 1", "Mistake"]);
    await restoreVersion(author, story.id, 2);
    expect((await getStoryWorkspace(author, story.id)).chapters.map((c) => c.id)).toEqual([
      firstChapterId,
      extra.id,
    ]);
  });

  it("brings back a deleted chapter from an older version", async () => {
    const { author, story, write } = await setup();
    await write("Keep me.");
    const second = await addChapter(author, story.id, { title: "Lost chapter" });
    await saveChapter(author, second.id, { content: doc("Precious words."), expectedRevision: 0 });
    await saveVersion(author, story.id);
    await deleteChapter(author, second.id);

    await restoreChapter(author, story.id, 1, second.id);
    const workspace = await getStoryWorkspace(author, story.id);
    expect(workspace.chapters.map((c) => [c.title, c.status])).toEqual([
      ["Chapter 1", "draft"],
      ["Lost chapter", "draft"],
    ]);
  });

  it("restoring doesn't change what readers see until the writer publishes", async () => {
    const { author, story, firstChapterId, write } = await setup();
    await write("Version A.");
    await saveVersion(author, story.id);
    await write("Version B.");
    await publishChapter(author, firstChapterId, { publishStory: true });
    await restoreChapter(author, story.id, 1, firstChapterId);

    const reader = await createUser();
    expect((await getReaderChapter(reader, "meera", "the-last-monsoon", 1))?.chapter.html).toBe(
      "<p>Version B.</p>",
    );
    expect((await getReaderChapter(author, "meera", "the-last-monsoon", 1))?.chapter.html).toBe(
      "<p>Version A.</p>",
    );
  });

  it("makes an open editor on the old text reload instead of overwriting", async () => {
    const { author, story, firstChapterId, write } = await setup();
    const saved = await write("Before.");
    await saveVersion(author, story.id);
    await write("After.");
    await restoreChapter(author, story.id, 1, firstChapterId);
    await expect(
      saveChapter(author, firstChapterId, {
        content: doc("stale tab"),
        expectedRevision: saved.revision + 1,
      }),
    ).rejects.toThrow(/changed somewhere else/);
  });
});

describe("public history", () => {
  it("lists only published versions of public stories", async () => {
    const { author, story, firstChapterId, write } = await setup();
    await write("Draft.");
    await saveVersion(author, story.id, "private note");
    expect(await listPublishedVersions(null, "meera", "the-last-monsoon")).toBeNull();

    await publishChapter(author, firstChapterId, {
      publishStory: true,
      message: "Opening chapter",
    });
    const second = await addChapter(author, story.id, { title: "Two" });
    await publishChapter(author, second.id, { publishStory: false });

    const history = await listPublishedVersions(null, "meera", "the-last-monsoon");
    expect(history?.versions.map((v) => [v.number, v.message, v.added])).toEqual([
      [3, "Published “Two”", 1],
      [2, "Opening chapter", 1],
    ]);
    const page = await getPublicStory(null, "meera", "the-last-monsoon");
    expect(page?.latestVersion?.number).toBe(3);
  });
});
