"use client";

import { useEffect, useState } from "react";

type IconName = "grid" | "play" | "proof" | "flow" | "arrow" | "chevron" | "copy" | "download" | "check" | "code" | "bug" | "box" | "reset" | "external" | "clock";
function Icon({ name, size = 20, className = "" }: { name: IconName; size?: number; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    play: <path d="m8 5 11 7-11 7V5Z"/>, proof: <><path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6l8-3Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/></>,
    flow: <><rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="15" y="15" width="6" height="6" rx="1.5"/><path d="M9 6h6a3 3 0 0 1 3 3v6M3 18h7m-3-3 3 3-3 3"/></>,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5"/>, chevron: <path d="m9 5 7 7-7 7"/>, copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></>,
    download: <><path d="M12 3v12m-4-4 4 4 4-4M4 15v5h16v-5"/></>, check: <path d="m5 12 4 4L19 6"/>,
    code: <><path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18"/></>, bug: <><rect x="7" y="6" width="10" height="15" rx="5"/><path d="m9 3 2 3m4-3-2 3M3 9l4 2m10 0 4-2M3 15h4m10 0h4M4 21l4-3m8 0 4 3M12 11v7"/></>,
    box: <><path d="m12 3 9 5v9l-9 5-9-5V8l9-5Zm0 10v9M3 8l9 5 9-5M7.5 5.5l9 5"/></>,
    reset: <><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/></>, external: <><path d="M14 3h7v7m0-7L11 13M10 3H4v17h17v-6"/></>, clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>{paths[name]}</svg>;
}

type Reservation = { status: number; stock: number | string | null; reserved: number | string | null; message: string };
type Mode = "original" | "fixed";
type Report = Record<string, unknown>;
function record(value: unknown): Report | null { return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Report : null; }
function textValue(value: unknown, fallback = "Unavailable") { return typeof value === "string" || typeof value === "number" ? String(value) : fallback; }
function resultValid(value: unknown): value is Reservation { const item = record(value); const validAmount = (amount: unknown) => typeof amount === "number" || typeof amount === "string" || amount === null; return Boolean(item && typeof item.status === "number" && validAmount(item.stock) && validAmount(item.reserved) && typeof item.message === "string"); }

const bobPrompt = `Investigate the synthetic inventory bug in this repository: with 5 units available, reserving 7 succeeds and leaves negative stock. Reproduce the defect, write a regression assertion that fails against the original implementation, then repair the fixed implementation. Reject invalid quantities without changing stock and verify successful, exact-stock, insufficient-stock, and invalid-input cases. Preserve the original fixture. Record the actual commands, results, and your contribution in docs/bob-investigation.md; capture the task summary in bob_sessions/. Do not fabricate outcomes or timings.`;
const workflow = [
  { number: "01", title: "Report the problem", detail: "Start with a specific, reproducible observation: five units in stock, seven requested, negative inventory.", icon: "bug" as IconName },
  { number: "02", title: "Make it fail", detail: "Ask Bob to investigate and create a regression assertion. Run it against the original fixture to prove it catches the defect.", icon: "code" as IconName },
  { number: "03", title: "Repair with Bob", detail: "Use Bob IDE to validate the inputs and stock boundary. Keep the original fixture so the comparison stays repeatable.", icon: "flow" as IconName },
  { number: "04", title: "Verify & preserve", detail: "Rerun the same assertion and related checks. Save actual results, revision details, and Bob task-summary screenshots.", icon: "proof" as IconName },
];

export default function Home() {
  const [active, setActive] = useState("overview");
  const [quantity, setQuantity] = useState("7");
  const [results, setResults] = useState<Partial<Record<Mode, Reservation>>>({});
  const [errors, setErrors] = useState<Partial<Record<Mode, string>>>({});
  const [busy, setBusy] = useState(false);
  const [inputError, setInputError] = useState("");
  const [lastQuantity, setLastQuantity] = useState<number | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(true);
  const [tab, setTab] = useState<"tests" | "patch" | "provenance">("tests");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    let cancelled = false;
    fetch("/evidence/report.json", { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("Evidence unavailable");
      const data: unknown = await response.json();
      if (!cancelled) setReport(record(data));
    }).catch(() => { if (!cancelled) setReport(null); }).finally(() => { if (!cancelled) setEvidenceLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function runComparison() {
    if (busy) return;
    if (!quantity.trim() || !Number.isFinite(Number(quantity))) { setInputError("Enter a quantity to test."); return; }
    const requested = Number(quantity);
    setInputError(""); setBusy(true); setResults({}); setErrors({}); setLastQuantity(requested);
    await Promise.all((["original", "fixed"] as const).map(async mode => {
      try {
        const response = await fetch("/api/reserve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity: requested, mode }) });
        const data: unknown = await response.json();
        if (!resultValid(data)) throw new Error("The service returned an unexpected response. Please try again.");
        setResults(current => ({ ...current, [mode]: data }));
      } catch (error) { setErrors(current => ({ ...current, [mode]: error instanceof Error ? error.message : "Could not reach the service." })); }
    }));
    setBusy(false);
  }
  function reset() { setQuantity("7"); setResults({}); setErrors({}); setLastQuantity(null); setInputError(""); }
  async function copyPrompt() {
    try { await navigator.clipboard.writeText(bobPrompt); setCopyState("copied"); } catch { setCopyState("failed"); }
  }
  const nav = [{ id: "overview", label: "Overview", icon: "grid" }, { id: "playground", label: "Playground", icon: "play" }, { id: "evidence", label: "Evidence", icon: "proof" }, { id: "workflow", label: "Bob workflow", icon: "flow" }] as const;
  const tests = Array.isArray(report?.cases) ? report.cases.map(record).filter((item): item is Report => item !== null) : [];
  const generated = report?.generatedAt;
  const source = record(report?.source);
  const summary = record(report?.summary);
  const provenance = record(report?.provenance);
  const testRun = record(report?.testRun);
  const revision = source?.revision;
  const testCount = tests.length;
  const patch = typeof report?.patch === "string" ? report.patch : null;
  const originalFailed = typeof summary?.originalFailed === "number" ? summary.originalFailed : null;
  const fixedPassed = typeof summary?.fixedPassed === "number" ? summary.fixedPassed : null;
  const allFixedPassed = fixedPassed !== null && fixedPassed === testCount && testCount > 0;
  const dateLabel = typeof generated === "string" && Number.isFinite(new Date(generated).getTime()) ? new Date(generated).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC" : "Not available";

  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    <aside className="sidebar" aria-label="Primary navigation">
      <a href="#overview" className="brand" onClick={() => setActive("overview")}><span className="brand-icon"><Icon name="proof" size={23}/></span><span>bugproof<span className="brand-dot">.</span></span></a>
      <div className="workspace-switch"><span className="workspace-avatar">B</span><span><strong>BugProof workspace</strong><small>IBM Bob Hackathon</small></span><span className="workspace-chevron">⌄</span></div>
      <div className="nav-caption">WORKSPACE</div>
      <nav>{nav.map(item => <a key={item.id} href={`#${item.id}`} className={`nav-item ${active === item.id ? "active" : ""}`} onClick={() => setActive(item.id)} aria-current={active === item.id ? "page" : undefined}><Icon name={item.icon} size={19}/><span>{item.label}</span>{item.id === "evidence" && <span className="nav-count">{testCount || "—"}</span>}</a>)}</nav>
      <div className="sidebar-bottom"><div className="bob-note"><span className="bob-symbol">✳</span><strong>A better way to debug.</strong><p>Investigate with IBM Bob.<br/>Keep the proof with BugProof.</p><a href="#workflow" onClick={() => setActive("workflow")}>Explore the workflow <Icon name="arrow" size={15}/></a></div><div className="workspace-foot"><span className="small-avatar">BP</span><span><strong>Demo workspace</strong><small>Synthetic data only</small></span><span className="status-dot"/></div></div>
    </aside>

    <main id="main" className="main">
      <header className="topbar"><div className="breadcrumb">Workspace <Icon name="chevron" size={13}/><span>{nav.find(item => item.id === active)?.label || "Overview"}</span></div><div className="topbar-right"><span className="demo-pill"><span/>Interactive demo</span><span className="version">v1.0</span></div></header>
      <div className="content">
        <section id="overview" className="overview-section">
          <div className="masthead"><div><div className="eyebrow"><span className="eyebrow-line"/> LESS GUESSWORK. MORE EVIDENCE.</div><h1>From bug report<br/>to <span>proof.</span></h1><p className="intro">Reproduce the failure. Verify the repair.<br className="desktop-break"/> Give every fix an evidence trail.</p></div><div className="masthead-aside"><span className="scenario-label">YOUR FIRST CASE</span><div className="case-mark"><Icon name="bug" size={28}/></div><span className="mono">BP-001</span><span>Inventory boundary</span></div></div>
          <div className="journey" aria-label="BugProof workflow">{[{label:"Bug report",icon:"bug"},{label:"Reproduce",icon:"play"},{label:"Regression test",icon:"code"},{label:"Bob-assisted fix",icon:"flow"},{label:"Verified evidence",icon:"proof"}].map((step,index) => <div className="journey-step" key={step.label}><span className={`journey-icon journey-icon-${index}`}><Icon name={step.icon as IconName} size={17}/></span><span>{step.label}</span>{index < 4 && <Icon name="chevron" className="journey-arrow" size={15}/>}</div>)}</div>
          <div className="report-card"><div className="report-main"><div className="card-kicker"><span className="issue-id">BP-001</span><span className="tag tag-orange">Seeded defect</span><span className="tag tag-neutral">Inventory API</span></div><h2>When seven is more than five.</h2><p>A reservation succeeds even when the requested quantity exceeds available stock. The result: inventory drops below zero.</p><div className="report-meta"><span><Icon name="box" size={15}/> DEMO-001</span><span className="meta-divider"/><span>5 units available</span><span className="meta-divider"/><span>7 units requested</span></div></div><div className="expected"><div className="expected-title"><span className="expected-check"><Icon name="check" size={13}/></span>Expected behavior</div><p>Reject the reservation.<br/>Keep inventory at <strong>5.</strong></p><code>409 · Insufficient stock</code><div className="synthetic-caption">Fictional service · isolated state</div></div></div>
        </section>

        <section id="playground" className="section playground-section">
          <div className="section-heading"><div><div className="eyebrow">01 / PLAYGROUND</div><h2>See the difference.</h2><p>One request. Two implementations. Inspect what actually happens.</p></div><button className="text-button" onClick={reset} disabled={busy}><Icon name="reset" size={16}/>Reset</button></div>
          <form className="play-controls" onSubmit={event => { event.preventDefault(); void runComparison(); }}><div className="request-detail"><span className="method">POST</span><code>/api/reserve</code><span className="control-divider"/><span className="stock-caption"><Icon name="box" size={16}/>Starting stock <strong>5</strong></span></div><div className="quantity-control"><label htmlFor="quantity">Quantity</label><input id="quantity" type="number" step="any" value={quantity} onChange={event => setQuantity(event.target.value)} aria-describedby={inputError ? "quantity-error" : "reset-note"} aria-invalid={Boolean(inputError)} disabled={busy}/><button className="primary-button" type="submit" disabled={busy}><Icon name="play" size={15}/>{busy ? "Running…" : "Run comparison"}</button></div></form>
          {inputError && <p className="input-error" id="quantity-error" role="alert">{inputError}</p>}
          <div className="quick-tests"><span>Try a case</span>{[{label:"Over capacity",value:"7"},{label:"Valid request",value:"3"},{label:"Exact stock",value:"5"},{label:"Invalid quantity",value:"-1"}].map(item => <button key={item.value} disabled={busy} className={quantity === item.value ? "selected" : ""} onClick={() => setQuantity(item.value)}>{item.label}<span>{item.value}</span></button>)}</div>
          <div className="comparison-grid" aria-live="polite">{(["original", "fixed"] as const).map(mode => {
            const value = results[mode]; const error = errors[mode]; const isOriginal = mode === "original"; const numericStock = value && typeof value.stock === "number" ? value.stock : null; const badStock = numericStock !== null && numericStock < 0; const invalidAccepted = Boolean(isOriginal && value && value.status < 400 && lastQuantity !== null && (!Number.isSafeInteger(lastQuantity) || lastQuantity <= 0));
            return <article key={mode} className={`result-card ${isOriginal ? "original" : "fixed"}`}><div className="result-header"><div className="result-title"><span className="result-symbol"><Icon name={isOriginal ? "bug" : "proof"} size={18}/></span><div><h3>{isOriginal ? "Original bug" : "Repaired implementation"}</h3><span>{isOriginal ? "Unvalidated subtraction" : "Input + availability checks"}</span></div></div><span className="implementation-badge">{isOriginal ? "BEFORE" : "AFTER"}</span></div><div className="result-body"><div className="response-label"><span>REMAINING STOCK</span>{value && <span className={`http-status ${value.status >= 400 ? "http-rejected" : ""}`}>{value.status} {value.status === 200 ? "OK" : value.status === 409 ? "CONFLICT" : value.status === 400 ? "BAD REQUEST" : "RESPONSE"}</span>}</div><div className={`stock-number ${badStock ? "negative-stock" : ""}`}>{value ? String(value.stock) : "—"}<span>units</span>{value && <div className={`stock-tag ${badStock || invalidAccepted ? "bad" : "good"}`}><span/>{badStock ? "Below zero" : invalidAccepted ? "Invalid accepted" : numericStock === null ? "Invalid stock" : value.status >= 400 ? "Stock preserved" : "Within bounds"}</div>}</div><div className="inventory-visual" aria-hidden="true">{Array.from({length:5},(_,index) => <span key={index} className={value ? index < Math.min(5, Math.max(0,numericStock ?? 0)) ? "unit-active" : "unit-empty" : "unit-initial"}><Icon name="box" size={23}/></span>)}{badStock && <span className="negative-overflow">{numericStock}</span>}</div><div className={`result-message ${error ? "error-message" : ""}`}><Icon name={value ? isOriginal && (badStock || invalidAccepted) ? "bug" : "check" : "code"} size={17}/><span>{error || (value ? value.message : busy ? "Sending request to the service…" : "Ready. Run a request to inspect the response.")}</span></div><div className="result-footer"><span>Requested <strong>{lastQuantity ?? "—"}</strong></span><span>Reserved <strong>{value ? String(value.reserved) : "—"}</strong></span><span>Starting stock <strong>5</strong></span></div></div></article>;
          })}</div><p className="reset-note" id="reset-note"><Icon name="reset" size={13}/>Every request starts with 5 units. State is isolated and resets automatically; this demo does not model concurrent reservations.</p>
        </section>

        <section id="evidence" className="section evidence-section"><div className="section-heading"><div><div className="eyebrow">02 / EVIDENCE</div><h2>The proof behind the patch.</h2><p>Recorded results from the repository. A passing check is only as useful as its evidence.</p></div>{report ? <a href="/evidence/report.json" download="bugproof-evidence.json" className="secondary-button"><Icon name="download" size={16}/>Export report</a> : <span className="pending-pill">{evidenceLoading ? "Loading evidence…" : "Evidence pending"}</span>}</div><div className="evidence-card"><div className="evidence-tabs" role="tablist" aria-label="Evidence details" onKeyDown={event => {
            const tabs = ["tests", "patch", "provenance"] as const;
            const current = tabs.indexOf(tab);
            const next = event.key === "ArrowRight" ? tabs[(current + 1) % tabs.length] : event.key === "ArrowLeft" ? tabs[(current + tabs.length - 1) % tabs.length] : event.key === "Home" ? tabs[0] : event.key === "End" ? tabs[tabs.length - 1] : null;
            if (next) { event.preventDefault(); setTab(next); document.getElementById(`tab-${next}`)?.focus(); }
          }}>{([{id:"tests",label:"Test results",icon:"check"},{id:"patch",label:"The repair",icon:"code"},{id:"provenance",label:"Provenance",icon:"flow"}] as const).map(item => <button key={item.id} id={`tab-${item.id}`} role="tab" tabIndex={tab === item.id ? 0 : -1} aria-selected={tab === item.id} aria-controls={`panel-${item.id}`} className={tab === item.id ? "selected" : ""} onClick={() => setTab(item.id)}><Icon name={item.icon} size={16}/>{item.label}{item.id === "tests" && testCount > 0 && <span>{testCount}</span>}</button>)}<span className="recorded-label"><span/>Recorded evidence</span></div>
          <div className="evidence-panel" id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={0}>
          {tab === "tests" && (tests.length > 0 ? <><div className="evidence-summary"><div><span className="label">VERIFICATION RECORD</span><h3>{allFixedPassed ? "The repair passes every recorded check." : `${testCount} recorded checks`}</h3></div><span className={`tag ${allFixedPassed ? "tag-green" : "tag-neutral"}`}>{fixedPassed !== null ? `${fixedPassed} / ${testCount} repaired checks passed` : "Synthetic inventory scenario"}</span></div>{originalFailed !== null && <p className="evidence-run-note">{originalFailed} original {originalFailed === 1 ? "failure" : "failures"} caught · {textValue(testRun?.passed, "—")} repository tests passed{typeof testRun?.durationMs === "number" ? ` · ${(testRun.durationMs / 1000).toFixed(2)}s test run` : ""}</p>}<div className="test-table"><div className="test-row table-head"><span>ASSERTION</span><span>ORIGINAL</span><span>REPAIRED</span></div>{tests.map((test,index) => <div className="test-row" key={index}><span><span className="test-index">{String(index+1).padStart(2,"0")}</span>{textValue(test.name, `Check ${index+1}`)}</span><TestStatus value={test.original}/><TestStatus value={test.fixed}/></div>)}</div></> : <div className="empty-evidence"><span className="empty-icon"><Icon name="proof" size={27}/></span><h3>{evidenceLoading ? "Loading the evidence trail" : "Evidence is not available yet"}</h3><p>Run the repository verification workflow to produce the report. Results will appear here after the generated evidence is included.</p><span className="mono">/evidence/report.json</span></div>)}
          {tab === "patch" && <div className="repair-layout"><div><span className="label">THE REPAIR STRATEGY</span><h3>Validate before changing state.</h3><p>The original fixture subtracts a requested quantity without checking availability. The repaired implementation checks valid whole numbers and available stock first.</p><ul className="repair-checks"><li><Icon name="check" size={15}/>Reject zero, negative, fractional, and invalid quantities.</li><li><Icon name="check" size={15}/>Return a conflict if the request exceeds available stock.</li><li><Icon name="check" size={15}/>Preserve stock whenever the reservation is rejected.</li></ul></div><div className="code-card"><div className="code-title"><Icon name="code" size={15}/>{patch ? "Recorded patch" : "Expected contract"}</div><pre><code>{patch || "reserve(5, 7)  →  409 · stock: 5\nreserve(5, 3)  →  200 · stock: 2\nreserve(5, 5)  →  200 · stock: 0\nreserve(5, -1) →  400 · stock: 5"}</code></pre><span>{patch ? "From the generated evidence report." : "Acceptance criteria, not test-run results."}</span></div></div>}
          {tab === "provenance" && <div className="provenance-layout"><div><span className="label">A TRACEABLE WORKFLOW</span><h3>Real runs. Clear attribution.</h3><p>IBM Bob works in the local IDE. This dashboard displays saved evidence and calls the sample API; it does not start or impersonate a live Bob session.</p><div className="provenance-note"><Icon name="flow" size={20}/><span>{textValue(provenance?.bobContribution, "See the repository investigation notes for Bob contribution details. Session evidence is listed in the verification report when available.")}</span></div></div><dl className="provenance-details"><div><dt>Evidence generated</dt><dd>{dateLabel}</dd></div><div><dt>Code revision</dt><dd className="mono">{textValue(revision, report ? "Uncommitted working tree" : "Not available")}{source?.dirty === true ? " · modified" : ""}</dd></div><div><dt>Source fingerprint</dt><dd className="mono">{typeof source?.sourceHash === "string" ? source.sourceHash.slice(0, 20) + "…" : "Not available"}</dd></div><div><dt>Dataset</dt><dd>Synthetic · DEMO-001</dd></div><div><dt>Scope</dt><dd>Single-item reservations; isolated state</dd></div><div><dt>Timing claims</dt><dd>No time-savings claim without a measured baseline</dd></div></dl></div>}
          </div><div className="evidence-footer"><Icon name="proof" size={14}/><span>Passing checks demonstrate these scenarios. They do not prove the absence of all bugs.</span><span className="evidence-file mono">{report ? "report.json" : "Awaiting report"}</span></div></div></section>

        <section id="workflow" className="section workflow-section"><div className="section-heading"><div><div className="eyebrow">03 / BOB WORKFLOW</div><h2>Make the process repeatable.</h2><p>A focused investigation, a preserved regression, and evidence you can review.</p></div><button className="secondary-button" onClick={() => void copyPrompt()}><Icon name={copyState === "copied" ? "check" : "copy"} size={16}/>{copyState === "copied" ? "Prompt copied" : "Copy Bob prompt"}</button></div>{copyState === "failed" && <div className="copy-fallback" role="status"><p>Clipboard access is unavailable. Select and copy the prompt below.</p><textarea readOnly value={bobPrompt} aria-label="Bob investigation prompt" onFocus={event => event.target.select()}/></div>}<div className="workflow-grid">{workflow.map(step => <article className="workflow-step" key={step.number}><div className="workflow-step-top"><span className="workflow-number">{step.number}</span><Icon name={step.icon} size={22}/></div><h3>{step.title}</h3><p>{step.detail}</p></article>)}</div><div className="workflow-callout"><span className="bob-symbol">✳</span><p><strong>The fix is just the beginning.</strong> Keep the failing case, the repaired code, and the verification together—so the next developer can follow the evidence.</p><span className="callout-icon"><Icon name="arrow" size={22}/></span></div></section>
        <footer className="footer"><span><span className="footer-brand">bugproof.</span> Built for better developer workflows.</span><span>IBM Bob Hackathon <span className="footer-dot">·</span> Synthetic demonstration</span></footer>
      </div>
    </main>
  </div>;
}
function TestStatus({ value }: { value: unknown }) {
  const object = record(value);
  const status = typeof object?.passed === "boolean" ? object.passed ? "passed" : "failed" : textValue(object?.status ?? value, "unavailable");
  const normalized = status.toLowerCase();
  const passed = ["pass", "passed", "success", "true"].includes(normalized);
  const failed = ["fail", "failed", "failure", "false"].includes(normalized);
  return <span className={`test-status ${passed ? "passed" : failed ? "failed" : "unknown"}`}><span/>{passed ? "Passed" : failed ? "Failed" : status}</span>;
}
