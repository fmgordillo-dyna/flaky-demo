import { expect, test } from "@playwright/test";
import { chance } from "./chance.ts";

test.describe("flaky", () => {
  for (const name of [
    "loads the cart",
    "saves the profile",
    "renders the chart",
    "syncs the queue",
  ]) {
    test(name, ({}, testInfo) => {
      expect(chance(testInfo, 0.3), "random failure").toBe(false);
    });
  }
});
