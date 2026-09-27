# BugProof — Inventory Bug Investigation

## Summary

`reserveInventoryOriginal` blindly subtracts `quantity` from `stock` without
any validation.  Calling it with stock 5, quantity 7 returns `stock: -2`, a
physically impossible negative inventory level.

---

## Root Cause

```ts
// inventory-original.ts (defect)
const qty = quantity as number;
const remaining = stock - qty;   // no guard — goes negative
return { status: 200, stock: remaining, reserved: qty, message: "reserved" };
```

The function:
- Trusts the `quantity` argument unconditionally (cast, not validated).
- Never checks whether `quantity` is a positive safe integer.
- Never checks whether `quantity` exceeds available `stock`.
- Never validates that `stock` itself is a nonnegative safe integer.

---

## Files

| File | Role |
|---|---|
| `src/lib/inventory-original.ts` | Intentionally broken fixture — demonstrates the defect |
| `src/lib/inventory.ts` | Fixed implementation |
| `tests/inventory.test.ts` | Regression test + full behavioural suite (12 tests) |

---

## Step 1 — Regression test run BEFORE fix

Command:
```
CI=true PATH="…/node/bin:$PATH" …/pnpm test
```

Output (abridged — 9 failures, 3 passing):
```
 ❯ tests/inventory.test.ts (12 tests | 9 failed) 8ms
     × returns status 409 and preserves stock when quantity exceeds stock (stock=5, qty=7)
     ✓ normal reservation reduces stock correctly
     ✓ exact-stock reservation (quantity === stock)
     × returns 409 and does not mutate stock when qty > stock
     × zero quantity is invalid
     × negative quantity is invalid
     × fractional quantity is invalid
     × non-numeric string quantity is invalid
     × unsafe integer quantity is invalid
     × negative stock is invalid
     × fractional stock is invalid
     ✓ subtracts quantity with no guard: stock=5 qty=7 → remaining=-2

 Test Files  1 failed (1)
       Tests  9 failed | 3 passed (12)
    Duration  171ms (transform 22ms, setup 0ms, import 31ms, tests 8ms, environment 0ms)
```

Key assertion failure for the regression test:
```
AssertionError: expected 200 to be 409 // Object.is equality
 - Expected: 409
 + Received:  200
   at tests/inventory.test.ts:11:27
```

---

## Step 2 — Fix applied to `src/lib/inventory.ts`

Three ordered guards added before any arithmetic:

1. **Stock validation** — `!Number.isSafeInteger(stock) || stock < 0` → 400
2. **Quantity validation** — `!Number.isSafeInteger(quantity) || quantity <= 0` → 400
3. **Insufficient stock** — `qty > stock` → 409, stock preserved

---

## Step 3 — Full test run AFTER fix

Command:
```
CI=true PATH="…/node/bin:$PATH" …/pnpm test
```

Output:
```
 ✓ tests/inventory.test.ts (12 tests) 3ms

 Test Files  1 passed (1)
       Tests  12 passed (12)
    Duration  140ms (transform 22ms, setup 0ms, import 32ms, tests 3ms, environment 0ms)
```

All 12 tests pass including the unchanged regression test.

---

## Test coverage

| Test | Expected status | Notes |
|---|---|---|
| Regression: stock=5 qty=7 | 409, stock=5, reserved=0 | Core defect |
| Normal reservation (10, 3) | 200, stock=7, reserved=3 | Happy path |
| Exact-stock (5, 5) | 200, stock=0, reserved=5 | Boundary |
| qty > stock (3, 10) | 409, stock=3, reserved=0 | Insufficient |
| qty = 0 | 400 | Invalid quantity |
| qty = -3 | 400 | Invalid quantity |
| qty = 1.5 | 400 | Fractional |
| qty = "abc" | 400 | Non-numeric |
| qty = MAX_SAFE_INTEGER+1 | 400 | Unsafe integer |
| stock = -1 | 400 | Invalid stock |
| stock = 2.5 | 400 | Fractional stock |
| Original fixture (5, 7) | 200, stock=-2 | Demonstrates defect |
