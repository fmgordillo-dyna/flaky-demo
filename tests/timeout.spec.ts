import { test } from "@playwright/test";
import { chance } from "./chance.ts";

test.describe("timeout", () => {
  test("waits for a job", async ({}, testInfo) => {
    const slow = chance(testInfo, 0.3);
    await new Promise((resolve) => setTimeout(resolve, slow ? 3000 : 10));
  });
});
