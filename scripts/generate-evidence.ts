import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { reserveInventory } from "../src/lib/inventory";
import { reserveInventoryOriginal } from "../src/lib/inventory-original";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "public/evidence");
const temporary = mkdtempSync(join(tmpdir(), "bugproof-evidence-"));
const rawJson = join(temporary, "vitest.json");

function redact(value: string): string {
  return value.replaceAll(root, "<project>").replaceAll(temporary, "<temporary>")
    .replaceAll(homedir(), "<home>").replace(/\u001b\[[0-9;]*m/g, "")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "<redacted-email>")
    .replace(/(?:\/Users\/|\/home\/)[^\s"'<>]+/g, "<private-path>");
}

function filesIn(directory: string): string[] {
  if (!existsSync(join(root, directory))) return [];
  return readdirSync(join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const name = `${directory}/${entry.name}`;
    return entry.isDirectory() ? filesIn(name) : [name];
  });
}

function fingerprint() {
  const inputs = [...new Set([
    ...filesIn("src/lib"), ...filesIn("tests"), "app/api/reserve/route.ts", "scripts/generate-evidence.ts",
    "package.json", "pnpm-lock.yaml", "tsconfig.json", "vitest.config.ts",
  ])].filter((name) => existsSync(join(root, name))).sort();
  const hash = createHash("sha256");
  for (const name of inputs) hash.update(name).update("\0").update(readFileSync(join(root, name))).update("\0");
  return { sourceHash: hash.digest("hex"), inputs };
}

function sourceState(sourceHash: string) {
  const gitRoot = spawnSync("git", ["rev-parse", "--show-toplevel"], { cwd: root, encoding: "utf8" });
  // Do not accidentally attribute a containing Documents repository's revision.
  const localRepository = gitRoot.status === 0 && resolve(gitRoot.stdout.trim()) === root;
  const commit = localRepository ? spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }) : null;
  const status = localRepository ? spawnSync("git", ["status", "--porcelain", "--untracked-files=normal"], { cwd: root, encoding: "utf8" }) : null;
  return {
    revision: commit?.status === 0 ? commit.stdout.trim() : null,
    sourceHash,
    dirty: !localRepository || status?.status !== 0 || Boolean(status.stdout.trim()),
  };
}

type Expected = { status: number; stock: number; reserved: number };
const cases: { id: string; name: string; quantity: unknown; expected: Expected }[] = [
  { id: "excess", name: "Cannot reserve more than available", quantity: 7, expected: { status: 409, stock: 5, reserved: 0 } },
  { id: "normal", name: "Reserve three units", quantity: 3, expected: { status: 200, stock: 2, reserved: 3 } },
  { id: "exact", name: "Reserve exactly available stock", quantity: 5, expected: { status: 200, stock: 0, reserved: 5 } },
  ...[
    ["zero", "Reject zero", 0], ["negative", "Reject negative", -2], ["fractional", "Reject fractional", 1.5],
    ["text", "Reject nonnumeric text", "abc"], ["numeric-string", "Reject numeric strings", "3"],
    ["null", "Reject null", null], ["boolean", "Reject boolean", true],
    ["unsafe", "Reject unsafe integer", Number.MAX_SAFE_INTEGER + 1],
  ].map(([id, name, quantity]) => ({ id: String(id), name: String(name), quantity, expected: { status: 400, stock: 5, reserved: 0 } })),
];

function evaluate(run: typeof reserveInventory, quantity: unknown, expected: Expected) {
  const actual = run(5, quantity);
  const passed = actual.status === expected.status && actual.stock === expected.stock && actual.reserved === expected.reserved;
  // Preserve non-finite baseline output explicitly in interoperable JSON.
  const serializable = JSON.parse(JSON.stringify(actual, (_key, value: unknown) =>
    typeof value === "number" && !Number.isFinite(value) ? String(value) : value));
  return { ...serializable, passed };
}

try {
  const before = fingerprint();
  const source = sourceState(before.sourceHash);
  const started = performance.now();
  const test = spawnSync(process.execPath, [join(root, "node_modules/vitest/vitest.mjs"), "run", "--reporter=json", `--outputFile=${rawJson}`], {
    cwd: root, encoding: "utf8", timeout: 120_000, maxBuffer: 8 * 1024 * 1024,
  });
  const durationMs = Math.round(performance.now() - started);
  if (test.error) throw new Error(`Test runner failed: ${redact(test.error.message)}`);
  if (!existsSync(rawJson)) throw new Error(`Test runner produced no JSON report. ${redact(test.stderr || test.stdout).slice(0, 3000)}`);
  const run = JSON.parse(readFileSync(rawJson, "utf8"));
  if (!Number.isInteger(run.numPassedTests) || !Number.isInteger(run.numFailedTests) || !Number.isInteger(run.numTotalTests) || run.numTotalTests < 1) {
    throw new Error("Test runner report did not contain valid executed-test totals.");
  }
  const observations = cases.map((item) => ({ ...item,
    original: evaluate(reserveInventoryOriginal, item.quantity, item.expected),
    fixed: evaluate(reserveInventory, item.quantity, item.expected),
  }));
  const after = fingerprint();
  if (before.sourceHash !== after.sourceHash) throw new Error("Source changed during evidence generation. Run again after edits finish.");
  const originalPassed = observations.filter((item) => item.original.passed).length;
  const fixedPassed = observations.filter((item) => item.fixed.passed).length;
  const sessionEvidence = filesIn("bob_sessions").filter((name) => /\.(png|jpe?g)$/i.test(name)).sort();
  const report = {
    schemaVersion: 1, generatedAt: new Date().toISOString(), source,
    scenario: { id: "BP-001", title: "Prevent reservations from creating negative inventory", sku: "DEMO-001", startingStock: 5 },
    summary: { total: observations.length, originalPassed, originalFailed: observations.length - originalPassed, fixedPassed, fixedFailed: observations.length - fixedPassed },
    cases: observations,
    testRun: { command: "vitest run --reporter=json", passed: run.numPassedTests, failed: run.numFailedTests, durationMs },
    provenance: {
      bobContribution: "Bob IDE authored the inventory investigation, regression tests, and repair. See docs/bob-investigation.md and bob_sessions for session evidence. Website and evidence tooling are assistant-authored.",
      sessionEvidence,
      limitations: [
        "Synthetic, intentionally seeded inventory defect; each demonstration starts with five units.",
        "Original failures against the independent expectations are expected evidence of the defect, not a successful production implementation.",
        "The original fixture can produce non-finite numbers; these are serialized as strings such as NaN. Runtime string/boolean values are preserved.",
        "Recorded local verification; the public website does not invoke Bob or execute uploaded code.",
        "No persistent inventory, concurrency guarantee, security certification, or measured productivity baseline.",
        "The source hash identifies exact tested inputs. Git revision may be null or refer to an earlier commit when the workspace is dirty.",
        ...(sessionEvidence.length ? [] : ["Bob task-summary screenshots have not yet been added to bob_sessions."]),
        ...(test.status !== 0 ? ["The test runner exited unsuccessfully; inspect the raw capture before treating this as verified."] : []),
      ],
    },
  };
  mkdirSync(output, { recursive: true });
  const safeReport = JSON.parse(redact(JSON.stringify(report)));
  writeFileSync(join(output, "report.json"), JSON.stringify(safeReport, null, 2) + "\n");
  writeFileSync(join(output, "vitest-results.json"), redact(JSON.stringify(run, null, 2)) + "\n");
  writeFileSync(join(output, "test-output.txt"), redact(`exitCode: ${test.status}\n${test.stdout}\n${test.stderr}`));
  writeFileSync(join(output, "source-inputs.json"), JSON.stringify({ sourceHash: before.sourceHash, algorithm: "sha256", inputs: before.inputs }, null, 2) + "\n");
  console.log(`Evidence: ${relative(root, join(output, "report.json"))}; ${fixedPassed}/${observations.length} fixed oracle cases pass; ${originalPassed}/${observations.length} original cases pass; ${run.numPassedTests} tests passed, ${run.numFailedTests} failed.`);
  if (test.status !== 0 || run.numFailedTests !== 0 || fixedPassed !== observations.length || originalPassed === observations.length) process.exitCode = 1;
} catch (error) {
  console.error(redact(error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
