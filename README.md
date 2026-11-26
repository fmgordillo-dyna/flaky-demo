# flaky-radar-demo

Playwright Test project that produces known flaky tests and reports every test attempt to Flaky Radar with
[`fmgordillo-dyna/flaky-radar-action`](https://github.com/fmgordillo-dyna/flaky-radar-action). Tests are plain Node
tests, no browser. Use it to check that the Flaky Radar classification matches what the tests do.

## How it works

- Each CI run derives its randomness from the run id (`tests/chance.ts`). Reproduce a run with
  `DEMO_SEED=<run id> npm test`. Without a seed the local seed is fixed.
- `npm test` runs with 2 retries and writes `results.json` (Playwright JSON reporter).
- The upload step sends `results.json` to the Dynatrace built-in events endpoint. It never retries, never fails the
  build, and skips with a notice when the secrets are missing (forks).

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
- Secrets: `DT_URL` (environment URL without `.apps`) and `DT_TOKEN` (platform token, `openpipeline:events:ingest`
  only).

## Verify by hand

Compare the table above with the fix-next list in Flaky Radar. The fixed state shows only about 3 weeks after the
demo starts.

## License

MIT
