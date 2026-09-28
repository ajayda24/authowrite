import { expect, test } from "@playwright/test";
import { expectNoSeriousA11yViolations, signUp, uniqueUser } from "./helpers";

test("story history: publish, edit privately, compare and restore", async ({ page, browser }) => {
  const writer = uniqueUser("hist");
  await signUp(page, writer);
  await page.goto("/write/new");
  await page.getByLabel("Story title").fill("Tides");
  await page.getByRole("button", { name: "Start writing" }).click();
  await page.waitForURL(/\/chapters\//);
  const editorUrl = page.url();
  const workspace = editorUrl.replace(/\/chapters\/.*$/, "");

  const body = page.getByRole("textbox", { name: "Chapter text" });
  await body.click();
  await page.keyboard.type("The first tide came in at dawn.");
  await expect(page.locator('[data-save-state="saved"]')).toContainText("Saved", {
    timeout: 15_000,
  });

  // First publish, with a description of what changed.
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.getByLabel("What changed?").fill("Opening chapter");
  await page.getByRole("dialog").getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Published! Readers can now enjoy it.")).toBeVisible();

  // Further edits stay private until published.
  await body.click();
  await page.keyboard.press("End");
  await page.keyboard.type(" A secret second tide followed.");
  await expect(page.getByRole("button", { name: "Publish changes" })).toBeVisible();
  await expect(page.locator('[data-save-state="saved"]')).toContainText("Saved", {
    timeout: 15_000,
  });

  const reader = await browser.newPage();
  await reader.goto(`/${writer.username}/tides/1`);
  await expect(reader.getByText("The first tide came in at dawn.")).toBeVisible();
  await expect(reader.getByText("secret second tide")).toHaveCount(0);
  await reader.close();

  // Story history lists the published version; save another one by hand.
  await page.goto(`${workspace}/history`);
  await expect(page.getByRole("link", { name: "Version 1" })).toBeVisible();
  await expect(page.getByText("Opening chapter")).toBeVisible();
  await page.getByRole("button", { name: "Save a version" }).click();
  await page.getByLabel("Describe this version").fill("With the second tide");
  await page.getByRole("button", { name: "Save version" }).click();
  await expect(page.getByText("Saved as version 2.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Version 2" })).toBeVisible();
  await expectNoSeriousA11yViolations(page);

  // Compare the published version with the current draft.
  await page.goto(`${workspace}/history/compare?from=1&to=current`);
  await expect(page.getByText(/1 chapter changed/)).toBeVisible();
  await expect(page.getByText("Text changed")).toBeVisible();

  // Restore version 1: the draft goes back and a backup is kept.
  await page.goto(`${workspace}/history/1`);
  await page.getByRole("button", { name: "Restore" }).first().click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Restore" }).click();
  await expect(
    page.getByText(/Restored version 1\. Your previous work is saved as version 3\./),
  ).toBeVisible();
  await page.goto(editorUrl);
  await expect(body).toContainText("The first tide came in at dawn.");
  await expect(body).not.toContainText("secret second tide");

  // Readers can see the published history.
  await page.goto(`/${writer.username}/tides/history`);
  await expect(page.getByText("Opening chapter")).toBeVisible();
});
