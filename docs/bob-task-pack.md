# BugProof — focused IBM Bob tasks

Prepared before implementation. These are prompts to run in Bob IDE after the hackathon account is available. They are not completed task records. Use one task at a time, inspect the result, and save the relevant session-summary screenshot under `bob_sessions/`.

## Before the first task

Confirm the event account in Bob's settings and note remaining Bobcoins. Open only the intended project folder. Keep secrets outside source control and excluded from Bob context. Use the official IBM repository template's safeguards where appropriate. Do not paste credentials into these prompts.

The build brief is the product specification. Save a copy into the project when implementation starts. Ask Bob to read it before making changes. Resolve a critical uncertainty before letting a task expand.

## Task 1 — plan and create the smallest sample

> Read the BugProof build brief. First identify any blocking assumptions, then propose a concise implementation plan for one sample inventory reservation bug. Use TypeScript, a small Next.js application, and Vitest, after checking compatible versions. The sample starts with SKU DEMO-001 and five units. Its intentionally broken baseline accepts a reservation of seven and produces negative stock. Preserve that baseline in an explicitly named demo fixture. Create the minimum sample and a working valid-reservation test. Do not fix the introduced defect yet. Document how to reproduce it, how isolated demo state resets, and where the future corrected implementation will live. Keep dependencies and scope small. End with changed files, commands actually run, results, and unresolved issues.

Review: the introduced behavior is reproducible, the normal test is meaningful, and the baseline is clearly disclosed. Capture the session summary.

## Task 2 — investigate and prove the failure

> Investigate this report: “Reserving seven units of DEMO-001 succeeds even though only five are available.” Use repository context to locate the cause. Explain the expected behavior before editing: conflict response, stock still five, no successful reservation. Add a regression test that expresses that expected behavior and run it against the broken implementation. Keep the repair for the next task. Record the exact test command and actual failure. Do not manufacture execution results or change the expected outcome to match the bug. Stop after proving the failure and propose the smallest repair.

Review: the test fails because of the intended defect, not because of setup or syntax errors. Capture the session summary and test output.

## Task 3 — repair and verify

> Apply the smallest justified fix for the demonstrated inventory defect. Preserve the regression assertion and the explicitly labeled original-bug fixture. Validate input and stock before changing state. Run the same regression test against the repaired implementation. Add meaningful boundary checks for a normal reservation, exactly the available stock, excessive quantity, zero, negative, fractional, and nonnumeric input. Invalid requests must not mutate stock. Run relevant checks and report actual outcomes, files changed, and limitations. Do not claim concurrency safety or general correctness beyond what was tested.

Review: the original still fails the regression when tested as baseline, the repaired version passes, and related checks pass. Capture the session summary.

## Task 4 — produce traceable evidence

> Build a small report generator using actual test-run outputs. Record the scenario, tested code revision, timestamp, original and repaired outcomes, changed files, and measured durations where available. Treat failures and missing data explicitly. Exclude credentials, personal information, and machine-specific private paths. Include a short patch explanation grounded in the actual diff. A report should never mark a test passed merely because a code change exists. Document one repeatable command or sequence that regenerates the evidence from a clean checkout.

Review: regenerate once and compare the report against the underlying executions. Capture the session summary.

## Task 5 — build the judge-facing demonstration

> Build the BugProof dashboard around the verified inventory scenario and report. Let a visitor run clearly labeled Original bug and Verified fix demonstrations with sample data and isolated state. Display expected versus actual behavior, relevant test evidence, patch summary, and the report revision/time. Label recorded Bob results as recorded; do not present them as a live Bob response. The deployed site must work without Bob credentials or judge login and must not execute arbitrary user code. Keep the interface focused on understanding and verifying this one workflow. Prepare it for Vercel deployment and report what you actually checked.

Review: a visitor can observe the negative-stock bug, run the repaired case, and understand the evidence without being told where to click. Capture the session summary.

## Task 6 — review the complete workflow

> Review the finished project against the build brief and hackathon checklist. Check that report evidence corresponds to the tested revision, original/fixed labels are truthful, state resets work, invalid input is handled, and no secrets or prohibited data are committed. Review the instructions for a clean checkout. Identify actionable defects and fix only those within scope, then rerun affected checks. Summarize Bob's actual contributions for the usage statement. Do not invent contributions, metrics, screenshots, or completed requirements. List anything still needing a person, deployment, or submission action.

Review: resolve material failures before adding stretch scenarios. Save the final session summary and preserve each participant's earlier evidence.

## Bobcoin discipline

Use the first task to observe actual consumption, then adjust scope. Keep prompts tied to specific files and deliverables, avoid repeating repository-wide scans, and use ordinary test runs to verify deterministic behavior. Capture remaining balance after meaningful tasks. No guaranteed cost per task is assumed, and no additional hackathon Bobcoins should be expected.
