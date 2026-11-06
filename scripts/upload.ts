import { readFileSync } from "node:fs";
import {
  type PlaywrightReport,
  type RunContext,
  toEvents,
} from "./toEvents.ts";

/** One bulk POST of schema v0 events. No retry, and the exit code is always 0: a failed upload must not fail CI. */
async function upload(): Promise<void> {
  const {
    FLAKY_INGEST_URL: url,
    FLAKY_INGEST_TOKEN: token,
    GITHUB_REPOSITORY: repo,
    GITHUB_RUN_ID: runId,
  } = process.env;
  if (!url || !token) {
    console.log(
      "upload skipped: FLAKY_INGEST_URL or FLAKY_INGEST_TOKEN is not set",
    );
    return;
  }
  if (!repo || !runId) {
    console.log("upload skipped: not running in GitHub Actions");
    return;
  }
  const server = process.env.GITHUB_SERVER_URL ?? "https://github.com";
  const pullNumber = /^refs\/pull\/(\d+)\//.exec(
    process.env.GITHUB_REF ?? "",
  )?.[1];
  const context: RunContext = {
    repoUrl: `${server}/${repo}`,
    repoName: repo,
    headRef:
      process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || "main",
    sha: process.env.GITHUB_SHA ?? "",
    changeId: pullNumber ?? null,
    runId,
    runAttempt: Number(process.env.GITHUB_RUN_ATTEMPT ?? "1"),
    runUrl: `${server}/${repo}/actions/runs/${runId}`,
    trigger: process.env.GITHUB_EVENT_NAME ?? null,
    workflow: process.env.GITHUB_WORKFLOW ?? null,
  };
  const report = JSON.parse(
    readFileSync(process.env.RESULTS_FILE ?? "results.json", "utf8"),
  ) as PlaywrightReport;
  const events = toEvents(report, context);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(events),
  });
  console.log(`uploaded ${events.length} attempts: HTTP ${response.status}`);
}

upload().catch((error: unknown) => {
  console.log(
    `upload failed: ${error instanceof Error ? error.message : String(error)}`,
  );
});
