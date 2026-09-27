/**
 * Loads demo authors and stories so a fresh instance has something to read.
 *
 *   pnpm db:seed
 *
 * Idempotent: does nothing if the demo authors already exist. All demo
 * accounts use the password "authowrite-demo".
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import type { DocNode } from "@/lib/content/types";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { addChapter, publishChapter, saveChapter } from "@/server/services/chapters";
import { setBookmark, setFollow, setLike } from "@/server/services/social";
import { createStory, updateStory } from "@/server/services/stories";

const PASSWORD = "authowrite-demo";

function doc(...blocks: (string | { h: string } | { quote: string } | "***")[]): DocNode {
  return {
    type: "doc",
    content: blocks.map((block) => {
      if (block === "***") return { type: "horizontalRule" };
      if (typeof block === "string")
        return { type: "paragraph", content: [{ type: "text", text: block }] };
      if ("h" in block)
        return { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: block.h }] };
      return {
        type: "blockquote",
        content: [{ type: "paragraph", content: [{ type: "text", text: block.quote }] }],
      };
    }),
  };
}

const AUTHORS = [
  {
    name: "Meera Nair",
    username: "meera",
    email: "meera@demo.authowrite.org",
    bio: "I write about rain, rivers and the people who wait for them. Kochi.",
  },
  {
    name: "Tomás Reyes",
    username: "tomas",
    email: "tomas@demo.authowrite.org",
    bio: "Night-shift nurse, daytime science-fiction writer.",
  },
  {
    name: "Aiko Tan",
    username: "aiko",
    email: "aiko@demo.authowrite.org",
    bio: "Small mysteries in small towns.",
  },
];

interface SeedStory {
  author: string;
  title: string;
  description: string;
  genre: string;
  language: string;
  tags: string[];
  chapters: { title: string; content: DocNode }[];
}

const STORIES: SeedStory[] = [
  {
    author: "meera",
    title: "The Last Monsoon",
    description:
      "Every June, Ammini waits on the veranda for the first rain. This year, the rain brings a letter from a brother who has been gone for thirty years.",
    genre: "literary",
    language: "en",
    tags: ["monsoon", "family", "kerala"],
    chapters: [
      {
        title: "The Veranda",
        content: doc(
          "The rain came early that year, a week before the calendar said it should, and Ammini took it as a sign.",
          "She had been sitting on the veranda since the afternoon, watching the sky thicken over the coconut palms, the tea going cold beside her. Her knees ached the way they always did before a storm. Somewhere down the lane a radio was playing an old film song, and the sound of it drifted in and out with the wind.",
          "When the first drops finally hit the red earth of the courtyard, they made small dark coins, and the smell rose up at once — that smell she had known since she was a girl, of dust and relief and something like forgiveness.",
          "***",
          "The postman came an hour later, soaked to the skin, holding an envelope inside his shirt to keep it dry.",
          { quote: "“For you, Ammini-chechi. From Bombay.”" },
          "She did not know anyone in Bombay. Not anymore.",
        ),
      },
      {
        title: "A Letter in Blue Ink",
        content: doc(
          "The handwriting was her brother’s. She would have known it anywhere: the careful loops, the way he crossed his sevens like a schoolmaster.",
          "Thirty years. Thirty monsoons. She turned the envelope over twice before she opened it, as if it might change its mind.",
          "Inside was a single page, and a photograph of a house she had never seen, with a mango tree in front of it and a child on the steps.",
        ),
      },
    ],
  },
  {
    author: "meera",
    title: "മഴയുടെ വീട്",
    description: "ഒരു പഴയ തറവാടും, മഴക്കാലത്ത് തിരിച്ചെത്തുന്ന ഓർമ്മകളും.",
    genre: "short-story",
    language: "ml",
    tags: ["മഴ", "ഓർമ്മ"],
    chapters: [
      {
        title: "ഒന്നാം മഴ",
        content: doc(
          "ആ വർഷം മഴ നേരത്തെ വന്നു. മുറ്റത്തെ ചുവന്ന മണ്ണിൽ ആദ്യത്തെ തുള്ളികൾ വീണപ്പോൾ, അമ്മിണി വരാന്തയിൽ ഇരിക്കുകയായിരുന്നു.",
          "തെങ്ങുകൾക്ക് മുകളിൽ ആകാശം ഇരുണ്ടു. എവിടെയോ ഒരു പഴയ സിനിമാഗാനം റേഡിയോയിൽ കേൾക്കാമായിരുന്നു.",
          "മണ്ണിന്റെ മണം ഉയർന്നു — കുട്ടിക്കാലം മുതൽ അവൾക്കറിയാവുന്ന ആ മണം.",
        ),
      },
    ],
  },
  {
    author: "tomas",
    title: "Night Shift on Europa",
    description:
      "The only nurse on a research station under the ice. Forty patients, one reactor, and a sound in the walls that nobody else seems to hear.",
    genre: "sci-fi",
    language: "en",
    tags: ["space", "slow-burn", "medical"],
    chapters: [
      {
        title: "Handover",
        content: doc(
          "The day nurse left at 19:00 station time, which meant nothing under two kilometres of ice, but we kept it anyway. Rituals are how you stay human down here.",
          "“Bed six has been asking for water that isn’t recycled,” Priya said, pulling on her coat. “Bed eleven says the walls are humming.”",
          "“The walls are always humming.”",
          "“That’s what I told him.” She paused at the airlock. “He said it’s a different hum.”",
          { h: "22:40" },
          "I heard it on my second round. Not the reactor, not the pumps. Something lower, patient, almost like breathing.",
        ),
      },
    ],
  },
  {
    author: "aiko",
    title: "The Clockmaker’s Apprentice",
    description:
      "When the town clock stops at 3:17 every night, twelve-year-old Hana is the only one who notices — and the only one the clockmaker trusts with his secret.",
    genre: "mystery",
    language: "en",
    tags: ["cozy", "small-town", "puzzle"],
    chapters: [
      {
        title: "3:17",
        content: doc(
          "The clock in the square stopped at 3:17 on Tuesday night. Hana knew because she was awake, as she usually was, counting the chimes.",
          "By morning it was running again, and exactly on time, which was impossible. Somebody had fixed it in the dark.",
          "Mr. Okada at the clock shop said he had been asleep. But there was fresh brass dust on his sleeve, and he would not quite look at her.",
        ),
      },
      {
        title: "The Second Key",
        content: doc(
          "There were two keys to the clock tower. Everybody knew that. What nobody knew — until Hana found the note inside the pendulum case — was that there had once been a third.",
        ),
      },
    ],
  },
];

async function main() {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, "meera"));
  if (existing) {
    console.log("Demo data already present — nothing to do.");
    process.exit(0);
  }

  const ids = new Map<string, string>();
  for (const author of AUTHORS) {
    const result = await auth.api.signUpEmail({
      body: {
        name: author.name,
        email: author.email,
        password: PASSWORD,
        username: author.username,
      },
    });
    await db
      .update(users)
      .set({ bio: author.bio, displayUsername: author.username })
      .where(eq(users.id, result.user.id));
    ids.set(author.username, result.user.id);
    console.log(`Created @${author.username}`);
  }

  const storyIds: string[] = [];
  for (const seed of STORIES) {
    const actor = { id: ids.get(seed.author)! };
    const { story, firstChapterId } = await createStory(actor, { title: seed.title });
    await updateStory(actor, story.id, {
      title: seed.title,
      description: seed.description,
      genreSlug: seed.genre,
      language: seed.language,
      tags: seed.tags,
    });
    for (const [index, chapter] of seed.chapters.entries()) {
      const chapterId = index === 0 ? firstChapterId : (await addChapter(actor, story.id)).id;
      await saveChapter(actor, chapterId, {
        title: chapter.title,
        content: chapter.content,
        expectedRevision: 0,
      });
      await publishChapter(actor, chapterId, { publishStory: true });
    }
    storyIds.push(story.id);
    console.log(`Published “${seed.title}”`);
  }

  // A little social activity so "Popular" has something to rank.
  const [meera, tomas, aiko] = AUTHORS.map((a) => ({ id: ids.get(a.username)! }));
  await setFollow(tomas, meera.id, true);
  await setFollow(aiko, meera.id, true);
  await setLike(tomas, storyIds[0], true);
  await setLike(aiko, storyIds[0], true);
  await setBookmark(aiko, storyIds[0], true);
  await setLike(meera, storyIds[2], true);

  console.log(`\nDone. Sign in as meera / tomas / aiko with password "${PASSWORD}".`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
