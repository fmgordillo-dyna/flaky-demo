import { createHash } from "node:crypto";
import type { TestInfo } from "@playwright/test";

/** One seed per CI run, so a run can be reproduced with `DEMO_SEED=<run id> npm test`. */
const SEED = process.env.DEMO_SEED ?? process.env.GITHUB_RUN_ID ?? "local";

/** True with probability `p`, decided by the seed, the test title and the attempt. */
export function chance(testInfo: TestInfo, p: number): boolean {
  const digest = createHash("sha256")
    .update(`${SEED}|${testInfo.titlePath.join("|")}|${testInfo.retry}`)
    .digest();
  return digest.readUInt32BE(0) / 0x1_0000_0000 < p;
}

export function onMain(): boolean {
  return (
    (process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || "main") ===
    "main"
  );
}

/** Repo creation (2026-11-04) + 21 days. After it the "flaky then fixed" test always passes. */
export const FIX_DATE_MS = Date.parse("2026-11-25T00:00:00Z");
