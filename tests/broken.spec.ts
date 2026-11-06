import { expect, test } from "@playwright/test";

test.describe("broken", () => {
  for (const name of ["exports a report", "rejects an empty name"]) {
    test(name, () => {
      expect(1 + 1, "always wrong").toBe(3);
    });
  }
});
