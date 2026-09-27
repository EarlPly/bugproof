# Evidence and reservation boundary

Run `pnpm evidence` after Bob's inventory task is complete and files have stopped changing. It executes the installed Vitest runner, then calls both implementations against explicitly written expectations. It does not invent outcomes or use a model to judge correctness.

## Public outputs

- `/evidence/report.json`: schema version 1; generation timestamp, source identity, scenario, oracle-case totals and detailed original/fixed observations, real Vitest totals and duration, contribution statement, screenshot references, and limitations.
- `/evidence/vitest-results.json`: actual JSON reporter output with local paths and email-like strings redacted.
- `/evidence/test-output.txt`: captured runner stdout/stderr and exit code, redacted in the same way.
- `/evidence/source-inputs.json`: sorted input list and SHA-256 fingerprint.

The independent oracle requires excessive requests to return 409 with unchanged stock; invalid quantities to return 400 with unchanged stock; and valid reservations to return 200 with the expected remainder. `passed` compares status, stock, and reserved count before serialization. A failing original case is expected and demonstrates the seed defect. `testRun` instead counts the actual unit/API test assertions; these may successfully assert that the original fixture is broken.

The intentionally broken fixture can return JavaScript `NaN` and values inconsistent with its TypeScript declaration. Non-finite numbers are rendered as explicit strings (`"NaN"`, `"Infinity"`), while actual string/boolean values are preserved. Consumers should render original stock/reserved values as data, not assume they are numeric. This does not convert an invalid outcome into a passing case.

The SHA-256 input stream concatenates each sorted relative filename, NUL, file bytes, and NUL. Inputs comprise `src/lib`, all tests, the reservation route, this generator, package manifest, installed lockfile, TypeScript configuration, and Vitest configuration. A second fingerprint after execution rejects source changes during a run. Git metadata is included only when the app itself is a repository root. `dirty: true` is also used when no such repository exists, so a missing revision can never suggest a verified clean commit. The fingerprint is the definitive source identity. It does not claim to hash the operating system or all installed dependency bytes.

Durations are observed runner wall time and will vary. Timestamps and Git metadata may change between runs. Case ordering, expectations, and outcome values are deterministic for identical implementations. No time-saving percentage is claimed. Screenshots are listed only when actual PNG/JPEG files exist in `bob_sessions`; the generator never creates them. Their presence does not itself authenticate their content.

Generation exits unsuccessfully if the runner errors, no valid test results exist, any fixed oracle case fails, or the original unexpectedly passes everything. Runner failures remain explicit in report limitations; missing reporter output or changing source aborts generation rather than overwriting prior evidence. Regenerate and deploy the report together with its source after changes.

## Reservation endpoint

`POST /api/reserve` accepts `application/json` with exactly `{ "mode": "original" | "fixed", "quantity": scalar }`. Scalars are JSON number/string/boolean/null; invalid quantity values are deliberately accepted at the transport boundary so the selected implementation's behavior can be demonstrated. Arrays, objects, unknown properties, missing fields, malformed JSON, invalid UTF-8, and unsupported modes are rejected. Requests are limited to 4096 actual bytes, regardless of the Content-Length header. Invalid media types return 415 and oversized bodies return 413. Domain results retain their HTTP status.

Each request is an isolated synthetic experiment starting at five units. No database, mutable global inventory, uploaded code, dynamic evaluation, or external AI call is used. Responses disable caching. This endpoint does not provide persistent inventory or concurrency guarantees and should not be marketed as a production inventory service.
