import { expect, test } from "@playwright/test";
import { chance, onMain } from "./chance.ts";

test.describe("pr only", () => {
  for (const name of ["validates a branch name", "merges two configs"]) {
    test(name, ({}, testInfo) => {
      expect(
        !onMain() && chance(testInfo, 0.3),
        "random failure off main",
      ).toBe(false);
    });
  }
});
