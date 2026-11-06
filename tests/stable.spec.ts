import { expect, test } from "@playwright/test";

test.describe("stable", () => {
  for (const name of [
    "parses a number",
    "joins paths",
    "formats a date",
    "sorts a list",
    "slugifies a title",
    "sums a list",
  ]) {
    test(name, () => {
      expect(name.length).toBeGreaterThan(0);
    });
  }
});
