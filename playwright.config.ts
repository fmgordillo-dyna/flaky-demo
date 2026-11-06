import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  retries: 2,
  timeout: 1000,
  fullyParallel: true,
  reporter: [["list"], ["json", { outputFile: "results.json" }]],
  projects: [{ name: "node" }],
});
