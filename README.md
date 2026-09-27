# BugProof

**Turn an API failure into a test IBM Bob can act on.**

BugProof is a developer workbench for API failures. Paste a redacted request plus expected and observed responses; it compares the values and generates an editable Vitest regression test, issue summary, and focused task for IBM Bob IDE. A guided inventory example demonstrates the full workflow with real requests, Bob-assisted repair, 12 live comparisons, and genuine session evidence.

**Live demo:** https://bugproof-zeta.vercel.app (Vercel Hobby).

Pages: `/`, `/workbench`, `/missions`, `/lab/report`, `/lab/replay`, `/lab/repair`, `/lab/verify`, `/evidence`, and `/guide`.

Built for the [IBM Bob 2.0 Hackathon](https://lablab.ai/ai-hackathons/ibm-bob-2-hackathon).

## Try the scenario

Five units of sample item `DEMO-001` are available. Request seven:

- **Original bug:** the reservation succeeds and inventory becomes **−2**.
- **Verified fix:** the request returns **409 Conflict**, reserves nothing, and leaves **5** units.

Then try a valid quantity or a boundary case. Every request starts with five units, so experiments are independent. The original implementation remains available for comparison.

## Run locally

Install Node.js **22 or newer** and pnpm, then run:

```sh
pnpm install
pnpm dev
```

Open [localhost:3000](http://localhost:3000). To verify and prepare a production build:

```sh
pnpm test
pnpm typecheck
pnpm evidence
pnpm build
pnpm start
```

The evidence command uses `node --import tsx scripts/generate-evidence.ts`. It runs the real test suite, evaluates independent expectations against both implementations, and writes public reports under `public/evidence/`. Regenerate these reports after source changes and deploy them with the matching code.

## What the evidence proves

The completed verification run recorded **78 passing tests**. Across 11 independent scenario checks, the fixed implementation passed **11**, while the original passed **2** and failed **9**. The original failures are deliberate evidence of the defect. The website reads the generated report rather than assuming these counts remain current.

Each report includes a timestamp, source fingerprint, individual observations, test counts, measured runner duration, and limitations. The fingerprint identifies the tested inputs even before a Git commit exists. Raw test captures are sanitized before publication. See [the evidence format](docs/evidence-format.md) and [Bob's investigation](docs/bob-investigation.md).

## IBM Bob's role

Bob IDE authored the inventory implementation, preserved the original fixture, created regression and boundary tests, demonstrated failure before repair, and verified the repaired behavior. Its core task is recorded as `d24c4d88e3bed318d7f0048bc3c14824`, with observed consumption of **0.872 Bobcoins**. A second Bob task, `377671b5fbd7b5b820d8cafa987dcb53`, authored replay logic and 21 explanation/boundary tests (observed 1.39 Bobcoins). The assistant authored the website, HTTP boundary, and evidence tooling, and reviewed the explanation accuracy. Both genuine task summaries are preserved in `bob_sessions/`.

The public website displays recorded Bob-assisted results. It **does not call a live Bob API** or suggest that a visitor's click starts an AI coding session. Genuine task-summary screenshots belong in [bob_sessions](bob_sessions/); text records do not replace the required screenshots.

## Scope and limitations

The workbench creates editable handoff artifacts from responses supplied by the developer. The inventory example is a controlled sample service. It has no persistent stock, account system, database, concurrent reservation guarantee, or arbitrary repository execution. Passing the demonstrated checks does not prove the application has no other defects. No productivity improvement percentage is claimed without a comparable measured baseline.

The endpoint accepts a small JSON request, limits actual body size, validates its shape, and returns the selected implementation's HTTP status. The deliberately broken fixture may produce invalid values such as `NaN`; these remain visible as evidence.

## Project map

| Location | Purpose |
|---|---|
| `app/` | Interactive website and reservation endpoint |
| `src/lib/` | Bob-authored original and fixed inventory functions |
| `tests/` | Domain and HTTP boundary checks |
| `scripts/generate-evidence.ts` | Real test capture and independent comparison |
| `public/evidence/` | Published report and sanitized supporting output |
| `bob_sessions/` | Genuine Bob task-summary screenshots |
| `docs/` | Investigation, workflow, evidence specification, and submission checklist |

The [submission checklist](docs/submission-checklist.md) tracks remaining publication and media work. Original project code is licensed under the [MIT License](LICENSE); dependencies retain their own licenses.
