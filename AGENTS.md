# BugProof project instructions

Follow docs/build-brief.md and the IBM Bob hackathon rules. Use only non-sensitive sample data. Keep Bob evidence authentic. Do not fabricate test results, AI output, metrics, screenshots, or attribution. Bob IDE is a required core development tool; preserve relevant task summary screenshots in bob_sessions.

For the current Bob task, own ONLY src/lib/inventory.ts, src/lib/inventory-original.ts, tests/inventory.test.ts, and docs/bob-investigation.md. Another collaborator owns the website, reports and configuration. Do not edit their files or install packages. Dependencies are managed outside Bob to preserve coins. Do not publish or deploy from Bob.

Export from src/lib/inventory.ts: type ReservationResult = {status: number; stock: number; reserved: number; message: string}; function reserveInventory(stock: number, quantity: unknown): ReservationResult. Export reserveInventoryOriginal with the same signature from inventory-original.ts. Re-export ReservationResult if useful. The fixture intentionally subtracts quantity without stock validation. Fixed function must reject invalid quantity with 400, insufficient stock with 409, return 200 on success. Use Number.isSafeInteger for positive quantities, preserve stock on error. Validate stock as a nonnegative safe integer. No mutation or external side effects. No dependencies in domain files.

Use Node.js 22 or newer and pnpm from the local environment. Run `pnpm test` for verification. Dependency installation and package configuration remain assigned to the collaborator managing the website. Keep local runtime paths and account information out of committed instructions and public evidence.

Record actual failing test evidence before patching, then actual passing checks. Keep one report of commands and results. Do not write fabricated durations. Keep task concise to conserve the 40 Bobcoins.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
