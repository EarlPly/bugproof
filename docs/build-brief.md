# BugProof — build brief

Prepared September 25, 2026. Planning only; implementation has not started.

## Product decision

BugProof helps a developer turn a bug report into a reproducible failure, a verified patch, and a reviewable evidence report. IBM Bob IDE performs the investigation, regression-test creation, repair, and review. A small web dashboard makes the results understandable and lets a judge exercise the sample application.

Our promise: **Show why the bug happened, prove the fix works, and preserve a test that catches its return.** A passing regression test demonstrates protection for that scenario; it does not prove the application has no other bugs.

Target user: a developer maintaining an unfamiliar small service. The immediate problem is the manual work of translating a report into a reliable reproduction and proving that a proposed fix addresses it.

## First scenario: reserving more inventory than exists

Use a fictional inventory service with one item, `DEMO-001`, and five units in stock. All data is synthetic.

Bug report: “The service accepts a reservation for seven units even though only five are available. Stock becomes negative.”

Expected behavior:

- Reserving seven units returns a conflict response and leaves stock at five.
- Reserving three units succeeds and leaves stock at two.
- Reserving exactly five units succeeds and leaves stock at zero.
- Zero, negative, fractional, and nonnumeric quantities are rejected without changing stock.

The broken demonstration subtracts the requested quantity without checking availability. The corrected implementation validates the input and available stock before making the change. This is an intentionally seeded defect in a sample project, disclosed as such in the demo and submission.

Each web demonstration starts with isolated inventory. We will label this reset clearly. Shared persistent stock, concurrent reservations, and production inventory guarantees are outside the first version.

## What we build

1. **Sample service:** a narrow reservation endpoint and pure inventory logic that can be tested independently.
2. **Reusable Bob workflow:** focused instructions guiding report analysis, reproduction, test creation, repair, verification, and evidence preparation.
3. **Evidence report:** generated from actual test executions, recording the scenario, code revision, test results, changed files, and timings we genuinely measured.
4. **Judge-facing dashboard:** displays those results and provides interactive, clearly labeled “Original bug” and “Verified fix” demonstrations.

The original implementation remains a named fixture or separate baseline revision. The repaired implementation is the normal application path. Neither mode accepts arbitrary uploaded code or executes user-supplied commands.

### Visible workflow

Report → reproduce → failing regression test → Bob-assisted patch → passing verification → evidence report.

The dashboard shows the selected report, expected and observed behavior, test evidence, patch summary, and reproduction controls. Missing evidence must appear as “Not run” or “Unavailable,” never as a success.

### Proposed stack

TypeScript, a Next.js web application, Vitest for service tests, GitHub for the public repository, and Vercel for the live demonstration. Confirm current compatible versions at implementation time. This is a proposed implementation choice, not an organizer requirement.

Bob operates on the local repository through its IDE. The public site reads sanitized evidence produced by completed runs; it does not impersonate a live Bob session. A hosted report must identify its revision and run time. The video shows Bob performing the actual workflow alongside the resulting dashboard.

Do not assume Bob exposes an HTTP API. A website button that starts Bob automatically is outside the initial scope. First validate the IDE workflow and the organizer's expectation that this reusable workflow plus working application demonstrates Bob as a core component. Raise this interpretation at kickoff Q&A if the challenge briefing leaves it unclear.

## Acceptance gates

- The sample bug can be reproduced from a clean checkout with documented steps.
- The same regression assertion fails against the original behavior and passes against the repaired behavior.
- The expected result is independent of the implementation; do not weaken assertions to make a test pass.
- Normal reservations, exact-stock reservations, and invalid quantities are covered.
- The original and fixed web demonstrations match their labels and use isolated state.
- Test reports come from real executions and identify the tested revision.
- The live application is usable without the judges signing into our accounts.
- Bob's actual contributions and each participant's relevant session screenshots are retained.
- The repository contains no credentials or private data.

## Scope control

Finish one complete scenario before adding more. Stretch scenarios, only after the first acceptance gates pass: duplicate reservation requests and a stock-boundary error. Each must have an independent failing test and verified repair.

Exclude account systems, billing, arbitrary repository uploads, autonomous production changes, and broad support for many languages. Those features would consume the build window without improving the central demonstration.

## Measuring impact honestly

Record time spent on reproduction, test creation, repair, verification, and human intervention. Keep the raw results and note whether they came from a seeded sample.

The strongest initial evidence is functional: a reproducible defect, a regression test that catches it, a patch, and passing related checks. To claim time savings, use a documented manual baseline under comparable conditions. Repeating the same bug after learning its answer is not an unbiased comparison. If no defensible baseline is available, report observed workflow time without a percentage-improvement claim.

## Working agreement

**Earl:** use the provisioned IBM Bob account, review changes and outcomes, capture session summaries, and narrate the final demonstration.

**Assistant:** maintain scope and rule checks, prepare focused Bob instructions, review architecture and changes, help verify evidence, and prepare the submission materials. Attribute contributions accurately; assistant-written work must not be described as Bob-generated.

**IBM Bob:** materially contribute to the repository investigation, regression tests, repair, and review. Capture real evidence after each meaningful task rather than reconstructing it at the end.

Before access arrives: agree on this brief and prompts. After access arrives: verify the event account, then begin the implementation. Check the kickoff briefing for any clarified restrictions on prior work.

## 48-hour allocation

| Hours from kickoff | Outcome |
|---|---|
| 0–3 | Confirm access and rules; establish the sample and first Bob task |
| 3–12 | One complete reproduction → test → patch → verification workflow |
| 12–24 | Dashboard and real evidence report; preserve screenshots |
| 24–32 | Deploy and verify the public demonstration; fix problems |
| 32–40 | Rehearse the demo, measure supported outcomes, freeze features |
| 40–46 | Finish statements, slides, cover, video, repository checks, and submit |
| 46–48 | Submission buffer and essential corrections |

This allocation includes rest and handoffs within each block; it is not a recommendation to work continuously.

## Submission checklist

- [ ] Confirm all human team members are registered and on the lablab team.
- [ ] Use the hackathon-provisioned Bob account; verify its allocation before AI tasks.
- [ ] Working developer-workflow prototype with a live URL and platform name.
- [ ] Public GitHub repository containing original, MIT-compliant work and permitted dependencies/assets.
- [ ] Project title, short description, technology tags, and category tags.
- [ ] Problem & Solution statement, no more than 500 words.
- [ ] IBM Bob Usage statement, no more than 500 words, with specific contributions.
- [ ] `bob_sessions/` contains every participant's relevant task-summary screenshots. Prefer PNG and clear participant/task filenames.
- [ ] 16:9 cover image in PNG or JPG.
- [ ] Slide presentation in PDF.
- [ ] Narrated MP4 no longer than three minutes, with at least 90 seconds of the solution operating and visible Bob usage.
- [ ] Repository and public app checked from a signed-out browser.
- [ ] Submission completed before September 27, 2026, 11 PM Philippine time; verify final schedule at kickoff.

Suggested three-minute video: 0:00–0:20 problem; 0:20–2:20 working demonstration including Bob and test evidence; 2:20–2:45 measured result and limitations; 2:45–3:00 value and close.

## Rules and sources reviewed

Event page: https://lablab.ai/ai-hackathons/ibm-bob-2-hackathon

IBM guide: https://lablab-ibm-bob-2-hackathon-guide.s3.us.cloud-object-storage.appdomain.cloud/index.html

General rulebook: https://lablab.ai/hackathon-rules

Submission tutorial: https://lablab.ai/ai-articles/hackathon-guidelines

The IBM guide requires Bob IDE, provides 40 Bobcoins per participant without a top-up, makes Bob Shell and watsonx optional, and prohibits client data, personal information, social-media data, and unauthorized confidential material. Use only synthetic fixtures for this plan. The general rulebook lists Streamlit, Replit, or Vercel; this plan uses Vercel. Follow the event's stricter three-minute video limit rather than the generic tutorial's five-minute limit. Recheck event-specific instructions before building and submitting.

## Current setup status

IBMid registration and IDE installation are complete. The last Bob sign-in returned “Account Not Ready Yet.” Event-provided access remains unverified; the guide says invitations arrive at kickoff, September 25 at 11 PM Philippine time. No coding or Bobcoin-consuming tasks have been run for BugProof.
