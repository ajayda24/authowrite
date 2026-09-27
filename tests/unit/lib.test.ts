import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "@/lib/slug";
import { validateUsername } from "@/lib/usernames";
import { normalizeTag } from "@/server/services/stories";

describe("slugify", () => {
  it("creates readable slugs", () => {
    expect(slugify("The Last Monsoon!")).toBe("the-last-monsoon");
    expect(slugify("  It's   raining  ")).toBe("its-raining");
    expect(slugify("???")).toBe("untitled");
  });

  it("keeps non-Latin scripts", () => {
    expect(slugify("അവസാനത്തെ മഴ")).toBe("അവസാനത്തെ-മഴ");
  });

  it("finds a free slug", async () => {
    const taken = new Set(["story", "story-2"]);
    expect(await uniqueSlug("story", async (s) => taken.has(s))).toBe("story-3");
  });
});

describe("validateUsername", () => {
  it.each([
    ["ajay", null],
    ["Ajay_D", null],
    ["ab", "Use at least 3 characters."],
    ["explore", "That username is reserved."],
    ["-bad", expect.stringContaining("Use letters")],
    ["has space", expect.stringContaining("Use letters")],
  ])("%s", (value, expected) => expect(validateUsername(value)).toEqual(expected));
});

describe("normalizeTag", () => {
  it("normalizes tags", () => {
    expect(normalizeTag("#Slow Burn")).toBe("slow-burn");
    expect(normalizeTag("  മഴ ")).toBe("മഴ");
  });
});
