# Bob Replay Review — `createTrace`

## Overview

`src/lib/trace.ts` exports `createTrace(quantity, result, mode)`, a pure function that builds a four-step explanatory replay for one `reserveInventory` call. It is not live instrumentation or AI output — it derives every display value from the actual `quantity` and `Result` that are passed in. The function is stateless and has no side effects.

## Design rationale

The UI shows users *why* a reservation succeeded or failed. Rather than annotating the running code, the trace is computed after the fact from the same deterministic inputs and outputs that produced the domain result. This avoids any coupling between execution and explanation.

## Exported API

```ts
export type TraceStep = {
  id: string;          // "stock" | "input" | "compute" | "response"
  title: string;
  explanation: string;
  code: string;
  stock: number | string | boolean | null;
};

export function createTrace(
  quantity: Scalar,
  result: Result,
  mode: 'original' | 'fixed'
): TraceStep[];
```

`Scalar` and `Result` are re-used from `src/lib/lab.ts`.

## Four steps

| # | id | What it represents |
|---|----|--------------------|
| 1 | `stock` | Starting stock (always 5) before any call |
| 2 | `input` | The raw `quantity` value, with its actual JS type preserved |
| 3 | `compute` | The code path taken — validation guard (fixed) or blind cast-and-subtract (original) |
| 4 | `response` | The `ReservationResult` that was actually returned |

## `as number` is a type-only assertion

A key correctness point: `quantity as number` in TypeScript is a compile-time type annotation only. It does **not** convert the runtime value. The variable still holds whatever was passed in. JavaScript subtraction then coerces the operand according to its own rules:

| Runtime type of `quantity` | JS coercion | `5 - quantity` | `reserved` holds |
|----------------------------|-------------|----------------|-----------------|
| `number` (e.g. `7`) | none | `5 - 7 = -2` | `7` |
| `number` (e.g. `-2`) | none | `5 - (-2) = 7` | `-2` |
| `string` `"3"` (numeric) | coerced to `3` | `5 - 3 = 2` | `"3"` (still a string) |
| `string` `"banana"` | cannot coerce → NaN | `NaN` | `"banana"` (still a string) |
| `null` | coerced to `0` | `5 - 0 = 5` | `null` |
| `boolean` `true` | coerced to `1` | `5 - 1 = 4` | `true` |

`reserved` retains the original runtime value in all cases; only `stock` (the arithmetic result) is affected by coercion.

## NaN serialisation

`JSON.stringify` replaces `NaN` with `null` by default, which would make the response code block lie about the outcome. `serializeResult` uses a replacer that renders non-finite numbers as their string names (`"NaN"`, `"Infinity"`) so the output is always truthful.

## Boundary case behaviour

### Original mode (`reserveInventoryOriginal`)

| Input | `stock` result | `reserved` result | Explanation |
|-------|---------------|-------------------|-------------|
| `7` | `-2` | `7` | Oversell — stock goes negative |
| `-2` | `7` | `-2` | Negative subtracts a negative, adding stock |
| `"banana"` | `NaN` | `"banana"` | Cannot coerce string to number; arithmetic → NaN |
| `3` | `2` | `3` | Normal subtraction |
| `5` | `0` | `5` | Exact — empties stock |
| `0` | `5` | `0` | Zero accepted; stock unchanged |
| `"3"` | `2` | `"3"` | JS coerces `"3"` to `3`; reserved stays as string |
| `null` | `5` | `null` | JS coerces `null` to `0`; stock unchanged |
| `true` | `4` | `true` | JS coerces `true` to `1`; stock becomes 4 |

### Fixed mode (`reserveInventory`)

| Input | Status | Guard taken |
|-------|--------|-------------|
| `7` | 409 | Passes type check; `qty > stock` → 409 |
| `-2` | 400 | Fails `quantity > 0` → 400 |
| `"banana"` | 400 | Fails `Number.isSafeInteger` → 400 |
| `3` | 200 | All guards pass → subtract |
| `5` | 200 | All guards pass → subtract |
| `0` | 400 | Fails `quantity > 0` → 400 |
| `"3"` | 400 | Fails `Number.isSafeInteger` → 400 |
| `null` | 400 | Fails `Number.isSafeInteger` → 400 |
| `true` | 400 | Fails `Number.isSafeInteger` → 400 |

In every error case stock is preserved at 5. The compute-step explanation names the guard that fired before any subtraction occurs.

## Test command and actual output

```
node \
  node_modules/vitest/vitest.mjs run tests/trace.test.ts
```

```
 RUN  v4.1.11

 ✓ tests/trace.test.ts (21 tests) 12ms

 Test Files  1 passed (1)
       Tests  21 passed (21)
    Start at  20:42:37
    Duration  193ms (transform 44ms, setup 0ms, import 58ms, tests 12ms, environment 0ms)
```

21 tests, 0 failures. Tests call the actual domain functions (`reserveInventoryOriginal`, `reserveInventory`) at `stock = 5` and assert on both the domain result and the resulting `TraceStep[]` array, including explanation-semantics assertions for `"banana"`, `"3"`, `null`, and `true`.

The executable's machine-specific path is normalized to `node` above. After Bob's task, the website collaborator clarified one explanation sentence to say explicitly that `reserved` retains the original text; the implementation remains Bob-authored and reviewed.

## Files

| File | Purpose |
|------|---------|
| `src/lib/trace.ts` | `createTrace` implementation |
| `tests/trace.test.ts` | 21 boundary-case tests |
| `docs/bob-replay-review.md` | This document |
