import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { attemptEventV0Schema } from "../api/schemaV0.ts";
import { parseReport, type RunContext, toEvents } from "./toEvents.ts";

/** Real `dart test --file-reporter json:` output (test 1.33.0) of a probe file with groups, retries and a skip. */
const REPORT = readFileSync(new URL("fixtures/retries.jsonl", import.meta.url), "utf8");

const CONTEXT: RunContext = {
  repoUrl: "https://github.com/acme/probe",
  repoName: "acme/probe",
  headRef: "main",
  sha: "abc123",
  changeId: null,
  runId: "42",
  runAttempt: 1,
  runUrl: "https://github.com/acme/probe/actions/runs/42",
  trigger: "push",
  workflow: "ci",
  workspace: "/home/runner/work/probe/probe",
  startedAtMs: Date.UTC(2026, 10, 26, 7, 0, 0),
};

function attemptsOf(report: string, context: RunContext = CONTEXT) {
  return toEvents(parseReport(report), context);
}

describe("toEvents", () => {
  it("should emit valid schema v0 events only for real tests", () => {
    // GIVEN: the reporter output, which also has the hidden "loading" step

    // WHEN: it is mapped
    const events = attemptsOf(REPORT);

    // THEN: every event passes the app's schema and the loading step is left out
    expect(events.map((event) => attemptEventV0Schema.parse(event)["test.case.name"])).toEqual([
      "outer group inner passes",
      "outer group flaky retried",
      "outer group flaky retried",
      "always fails",
      "always fails",
      "skipped one",
      "top level",
    ]);
  });

  it("should split a retried test into one event per attempt", () => {
    // GIVEN: a test that fails once and passes on its retry

    // WHEN: it is mapped
    const attempts = attemptsOf(REPORT).filter(
      (event) => event["test.case.name"] === "outer group flaky retried",
    );

    // THEN: the first attempt failed with its error, the second passed
    expect(
      attempts.map((event) => [
        event["flaky.test.attempt"],
        event["test.case.result.status"],
        event["flaky.test.error.message"]?.split("\n")[0] ?? null,
        event["flaky.test.execution_count"],
      ]),
    ).toEqual([
      [1, "fail", "Expected: a value greater than <1>", 2],
      [2, "pass", null, 2],
    ]);
  });

  it("should keep the final failure when every attempt fails", () => {
    // GIVEN: a test that fails on its attempt and its retry

    // WHEN: it is mapped
    const attempts = attemptsOf(REPORT).filter((event) => event["test.case.name"] === "always fails");

    // THEN: both attempts failed
    expect(attempts.map((event) => event["test.case.result.status"])).toEqual(["fail", "fail"]);
  });

  it("should give each test a stable id from its file, groups and name", () => {
    // GIVEN: the same report mapped twice, once from a later run

    // WHEN: both are mapped
    const first = attemptsOf(REPORT)[0];
    const later = attemptsOf(REPORT, { ...CONTEXT, runId: "43", startedAtMs: CONTEXT.startedAtMs + 1000 })[0];

    // THEN: the id is the same and the title path is split per group
    expect(later?.["flaky.test.id"]).toBe(first?.["flaky.test.id"]);
    expect(first?.["flaky.test.title_path"]).toEqual([
      "test/probe_test.dart",
      "outer group",
      "inner",
      "passes",
    ]);
    expect(first?.["test.suite.name"]).toBe("inner");
  });

  it("should mark skipped tests and time attempts from the run start", () => {
    // GIVEN: the reporter output

    // WHEN: it is mapped
    const events = attemptsOf(REPORT);

    // THEN: the skip is kept as skipped and timestamps are wall-clock
    expect(
      events.find((event) => event["test.case.name"] === "skipped one")?.["test.case.result.status"],
    ).toBe("skipped");
    expect(events[0]?.timestamp).toBe(new Date(CONTEXT.startedAtMs + 835).toISOString());
  });

  it("should send the revision as the head revision on master", () => {
    // GIVEN: a run on clipious' default branch

    // WHEN: it is mapped
    const event = attemptsOf(REPORT, { ...CONTEXT, headRef: "master" })[0];

    // THEN: the commit is the head revision, not a merge revision
    expect([event?.["vcs.ref.head.revision"], event?.["flaky.vcs.ref.merge.revision"]]).toEqual(["abc123", null]);
  });

  it("should make an absolute suite path relative to the workspace", () => {
    // GIVEN: a report whose suite path is absolute, as flutter test writes it
    const report = REPORT.replace(
      '"path":"test/probe_test.dart"',
      '"path":"/home/runner/work/probe/probe/test/probe_test.dart"',
    );

    // WHEN: it is mapped
    const events = attemptsOf(report);

    // THEN: the file is repo-relative
    expect(events[0]?.["code.file.path"]).toBe("test/probe_test.dart");
  });

  it("should reject a known event with an unexpected shape", () => {
    // GIVEN: a testDone without a result
    const report = '{"testID":1,"skipped":false,"hidden":false,"type":"testDone","time":1}';

    // WHEN: it is parsed
    const parse = () => parseReport(report);

    // THEN: parsing fails instead of uploading wrong outcomes
    expect(parse).toThrow();
  });
});
