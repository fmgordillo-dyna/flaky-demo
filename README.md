# flaky-radar-demo

Playwright Test project that produces known flaky tests and reports every test attempt to Flaky Radar as schema v0
events. Tests are plain Node tests, no browser. Use it to check that the Flaky Radar classification matches what
the tests do.

Schema v0 spec: "Event schema v0". `scripts/schemaV0.ts` is this repo's copy of the type.

## How it works

- Each CI run derives its randomness from the run id (`tests/chance.ts`). Reproduce a run with
  `DEMO_SEED=<run id> npm test`. Without a seed the local seed is fixed.
- `npm test` runs with 2 retries and writes `results.json` (Playwright JSON reporter).
- `npm run upload` maps `results.json` to schema v0 and sends one bulk POST. It never retries, never fails the
  build, and logs a skip when `FLAKY_INGEST_URL` or `FLAKY_INGEST_TOKEN` is missing (forks) or when it does not
  run in GitHub Actions. Delete it when the Playwright reporter of PAPA-37663 exists.
- Labels: `flaky.synthetic: false`, `flaky.source.name: "playwright-demo"`, `flaky.test.tags: ["demo"]`.

## Expected classification

`main` is a run on `main`. `pr` is any other branch.

| Test                                                 | Behaviour                                            | Expected in Flaky Radar             |
| ---------------------------------------------------- | ---------------------------------------------------- | ----------------------------------- |
| `stable` x6                                          | Always passes                                        | Not listed                          |
| `flaky` x4: loads the cart, saves the profile, ...   | Fails at p = 0.3 per attempt; a retry usually passes | Confirmed                           |
| `broken` x2: exports a report, rejects an empty name | Fails on every attempt                               | Not flaky                           |
| `pr only` x2: validates a branch name, merges ...    | Flaky only when the branch is not `main`             | Flaky in the `pr` rollup only       |
| `fixed`: renews a token                              | Flaky until 2026-11-25, then always passes           | Fixed, 14 days after the last flake |
| `timeout`: waits for a job                           | At p = 0.3 it sleeps past the 1 s timeout            | Confirmed when a retry passes       |

## CI

- `flaky.yml`: every 2 hours on `main`, on `workflow_dispatch` and on pull requests.
- `touch-pr-branches.yml`: every 4 hours dispatches `flaky.yml` on the long-lived branches `demo/pr-a` and
  `demo/pr-b`, so there is always `pr` data. Create both branches from `main`.
- Secrets: `FLAKY_INGEST_URL` (the ingest source endpoint) and `FLAKY_INGEST_TOKEN` (ingest scope only).

## Verify by hand

Compare the table above with the fix-next list in Flaky Radar. The fixed state shows only about 3 weeks after the
demo starts.

## License

MIT
