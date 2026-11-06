import { createHash } from "node:crypto";
import type { AttemptEventV0 } from "./schemaV0.ts";

interface JsonResult {
  retry: number;
  status: "passed" | "failed" | "timedOut" | "skipped" | "interrupted";
  startTime: string;
  duration: number;
  error?: { message?: string };
}

interface JsonTest {
  projectName: string;
  expectedStatus: string;
  results: JsonResult[];
}

interface JsonSpec {
  title: string;
  file: string;
  tests: JsonTest[];
}

interface JsonSuite {
  title: string;
  file?: string;
  specs?: JsonSpec[];
  suites?: JsonSuite[];
}

export interface PlaywrightReport {
  config: { projects: { name: string; retries: number }[] };
  suites: JsonSuite[];
}

export interface RunContext {
  repoUrl: string;
  repoName: string;
  headRef: string;
  sha: string;
  changeId: string | null;
  runId: string;
  runAttempt: number;
  runUrl: string;
  trigger: string | null;
  workflow: string | null;
}

const STATUS: Record<
  JsonResult["status"],
  AttemptEventV0["test.case.result.status"]
> = {
  passed: "pass",
  failed: "fail",
  timedOut: "timed_out",
  skipped: "skipped",
  interrupted: "interrupted",
};

const ANSI = /\u001b\[[0-9;]*m/g;

function* specsOf(
  suite: JsonSuite,
  path: string[],
): Generator<{ spec: JsonSpec; path: string[] }> {
  for (const spec of suite.specs ?? []) {
    yield { spec, path };
  }
  for (const child of suite.suites ?? []) {
    yield* specsOf(child, [...path, child.title]);
  }
}

export function toEvents(
  report: PlaywrightReport,
  context: RunContext,
): AttemptEventV0[] {
  const onMain = context.headRef === "main";
  return report.suites.flatMap((root) =>
    [...specsOf(root, [])].flatMap(({ spec, path }) =>
      spec.tests.flatMap((test) => {
        const file = `tests/${spec.file}`;
        const titlePath = [file, ...path, spec.title];
        const testId = createHash("sha256")
          .update([context.repoUrl, test.projectName, ...titlePath].join("|"))
          .digest("hex")
          .slice(0, 32);
        const maxAttempts =
          (report.config.projects.find(
            (project) => project.name === test.projectName,
          )?.retries ?? 0) + 1;
        return test.results.map((result): AttemptEventV0 => ({
          "flaky.schema.version": "0",
          timestamp: result.startTime,
          "flaky.source.name": "playwright-demo",
          "flaky.source.has_attempt_data": true,
          "vcs.repository.url.full": context.repoUrl,
          "vcs.repository.name": context.repoName,
          "vcs.provider.name": "github",
          "vcs.ref.head.name": context.headRef,
          "vcs.ref.head.revision": onMain ? context.sha : null,
          "flaky.vcs.ref.merge.revision": onMain ? null : context.sha,
          "vcs.ref.base.name": null,
          "vcs.change.id": context.changeId,
          "flaky.vcs.revision.author": null,
          "flaky.cicd.provider": "github-actions",
          "cicd.pipeline.name": context.workflow,
          "cicd.pipeline.task.name": null,
          "cicd.pipeline.run.id": context.runId,
          "cicd.pipeline.run.url.full": context.runUrl,
          "flaky.cicd.pipeline.run.attempt": context.runAttempt,
          "flaky.cicd.trigger": context.trigger,
          "flaky.cicd.environment": null,
          "flaky.test.id": testId,
          "flaky.test.framework": "playwright",
          "code.file.path": file,
          "test.suite.name": path.at(-1) ?? null,
          "test.case.name": spec.title,
          "flaky.test.title_path": titlePath,
          "flaky.test.project": test.projectName,
          "flaky.test.attempt": result.retry + 1,
          "flaky.test.max_attempts": maxAttempts,
          "flaky.test.execution_count": test.results.length,
          "test.case.result.status": STATUS[result.status],
          "flaky.test.expected_status": test.expectedStatus,
          "flaky.test.error.message":
            result.error?.message?.replace(ANSI, "").slice(0, 4096) ?? null,
          "flaky.test.attempt.duration_ms": result.duration,
          "flaky.test.invocation": "normal",
          "flaky.test.shard": null,
          "flaky.test.tags": ["demo"],
          "flaky.test.owner": null,
          "flaky.synthetic": false,
        }));
      }),
    ),
  );
}
