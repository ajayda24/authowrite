import { expect, test } from "@playwright/test";
import { expectNoSeriousA11yViolations, signUp, uniqueUser } from "./helpers";

test.describe.configure({ mode: "serial" });

const writer = uniqueUser("writer");
const reader = uniqueUser("reader");
const storyTitle = `The Tide Keeper ${Date.now().toString(36)}`;
let storyUrl = "";
let workspaceUrl = "";

test("a writer can go from sign-up to a published story in minutes", async ({ page }) => {
  await signUp(page, writer);
  await expect(page.getByRole("heading", { name: "Your stories" })).toBeVisible();

  await page.getByRole("link", { name: "Start a story" }).click();
  await page.getByLabel("Story title").fill(storyTitle);
  await page.getByRole("button", { name: "Start writing" }).click();

  // Straight into the editor for chapter 1.
  await page.waitForURL(/\/write\/[^/]+\/chapters\/[^/]+$/);
  workspaceUrl = page.url().replace(/\/chapters\/.*$/, "");
  await page.getByLabel("Chapter title").fill("High Water");
  const body = page.getByRole("textbox", { name: "Chapter text" });
  await body.click();
  await page.keyboard.type("The lighthouse had been dark for eleven years.");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Then, one night in March, it blinked.");
  await expect(page.locator('[data-save-state="saved"]')).toContainText("Saved", {
    timeout: 15_000,
  });

  await page.getByRole("button", { name: "Publish" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("checkbox")).toBeChecked();
  await dialog.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Published! Readers can now enjoy it.")).toBeVisible();

  storyUrl = `/${writer.username}/${storyTitle.toLowerCase().replace(/\s+/g, "-")}`;
  await page.goto("/explore");
  await expect(page.getByRole("link", { name: storyTitle })).toBeVisible();
});

test("a reader can discover, read, follow and bookmark", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Discover stories worth getting lost in." }),
  ).toBeVisible();
  await page.getByRole("link", { name: storyTitle }).first().click();
  await expect(page).toHaveURL(new RegExp(`${storyUrl}$`));

  await page.getByRole("link", { name: "Start reading" }).click();
  await expect(page.getByRole("heading", { name: "High Water" })).toBeVisible();
  await expect(page.getByText("The lighthouse had been dark for eleven years.")).toBeVisible();

  // Social actions ask anonymous readers to sign in, then bring them back.
  await page.goto(storyUrl);
  await page.getByRole("button", { name: "Bookmark" }).click();
  await page.waitForURL(/\/sign-in\?next=/);
  await page.getByRole("link", { name: "Create an account" }).click();
  await page.waitForURL(/\/sign-up/);
  await signUp(page, reader, storyUrl);

  await page
    .getByRole("button", { name: `Follow ${writer.name}` })
    .first()
    .click();
  await expect(page.getByRole("button", { name: `Unfollow ${writer.name}` }).first()).toBeVisible();
  await page.getByRole("button", { name: "Bookmark" }).click();
  await expect(page.getByRole("button", { name: "Bookmarked" })).toBeVisible();

  await page.getByLabel("Your comment").fill("Couldn't stop reading.");
  await page.getByRole("button", { name: "Post comment" }).click();
  await expect(page.getByText("Couldn't stop reading.")).toBeVisible();

  await page.goto("/bookmarks");
  await expect(page.getByRole("link", { name: storyTitle })).toBeVisible();
});

test("other users cannot open a writer's workspace", async ({ page }) => {
  await signUp(page, uniqueUser("intruder"));
  const response = await page.goto(workspaceUrl);
  expect(response?.status()).toBe(404);
});

test("drafts stay private", async ({ page, browser }) => {
  const author = uniqueUser("drafter");
  await signUp(page, author);
  await page.goto("/write/new");
  await page.getByLabel("Story title").fill("Secret Draft");
  await page.getByRole("button", { name: "Start writing" }).click();
  await page.waitForURL(/\/chapters\//);

  const anonymous = await browser.newPage();
  const response = await anonymous.goto(`/${author.username}/secret-draft`);
  expect(response?.status()).toBe(404);
  await anonymous.close();
});

test("key pages have no serious accessibility violations", async ({ page }) => {
  for (const path of ["/", "/explore", "/sign-up", storyUrl, `${storyUrl}/1`]) {
    await page.goto(path);
    await expectNoSeriousA11yViolations(page);
  }
});
