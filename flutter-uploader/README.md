# Flutter uploader (draft for clipious)

Maps a `flutter test` JSON report to schema v0 attempt events and posts them, in one request, to the
`flaky-attempts` ingest source on upo4669d (ADR 0009, ADR 0020). Like flaky-demo's `scripts/upload.ts`, it never
retries and never fails the build.

| File                     | Role                                                                     |
| ------------------------ | ------------------------------------------------------------------------ |
| `toEvents.ts`            | `parseReport` (zod) and `toEvents`: reporter events to one v0 event per attempt |
| `upload.ts`              | GitHub Actions env to `RunContext`, read the report, POST                |
| `schemaV0.ts`            | Re-exports the app's v0 type; replaced by a copy when shipped            |
| `fixtures/retries.jsonl` | Real reporter output with groups, a retry that passes, one that fails, a skip |

## Ship into clipious

1. Copy `toEvents.ts` and `upload.ts` to `scripts/flaky/` in clipious.
2. Replace `schemaV0.ts` with a copy of flaky-demo's `scripts/schemaV0.ts`.
3. Add `scripts/flaky/package.json`:

   ```json
   { "private": true, "type": "module", "dependencies": { "zod": "^4.6.7" } }
   ```

4. In `.github/workflows/ci.yml`, write the report and upload it:

   ```yaml
   - name: Run offline tests
     id: tests
     run: flutter test --no-pub --file-reporter json:test-results.json test/bug_report_test.dart ...
   - uses: actions/setup-node@v4
     if: always()
     with:
       node-version: 24
   - name: Upload attempts
     if: always()
     working-directory: scripts/flaky
     run: npm install --no-audit --no-fund && node upload.ts
     env:
       RESULTS_FILE: ${{ github.workspace }}/test-results.json
       FLAKY_INGEST_URL: ${{ secrets.FLAKY_INGEST_URL }}
       FLAKY_INGEST_TOKEN: ${{ secrets.FLAKY_INGEST_TOKEN }}
   ```

5. Add the secrets `FLAKY_INGEST_URL` (the ingest source endpoint) and `FLAKY_INGEST_TOKEN` (ingest scope only).

Retries are what make a flake confirmed: set `retry: 2` in `dart_test.yaml`, or `retry:` on a test.
`--file-reporter` keeps the normal console output.

## Known limits

- `--update-goldens` runs are sent as `normal`, so they count. Do not upload them.
- Times are anchored at the report file's mtime, so they are off by the gap between the last test and the write.
