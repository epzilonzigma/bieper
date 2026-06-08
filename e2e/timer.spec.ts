import { expect, test } from "@playwright/test";

test("counts a short duration down to 00:00", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Minutes").fill("0");
  await page.getByLabel("Seconds").fill("3");

  // The configured duration shows before starting, so the final 00:00 assertion
  // is meaningful (the idle state is also 00:00).
  const digits = page.locator(".font-mono");
  await expect(digits).toHaveText("00:03");

  await page.getByRole("button", { name: "Start" }).click();

  // Start gates the countdown on the real start-bell finishing playing (or
  // play() rejecting) before the first tick — so we wait for the live digits to
  // reach 00:00 with a generous timeout rather than a fixed sleep. Budget for
  // the bell clip plus the 3s countdown. Assert observable state only; never
  // that audio actually played.
  await expect(digits).toHaveText("00:00", { timeout: 20000 });
});
