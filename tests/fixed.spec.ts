import { expect, test } from "@playwright/test";
import { chance, FIX_DATE_MS } from "./chance.ts";

test.describe("fixed", () => {
  test("renews a token", ({}, testInfo) => {
    expect(
      Date.now() < FIX_DATE_MS && chance(testInfo, 0.3),
      "random failure before the fix date",
    ).toBe(false);
  });
});
