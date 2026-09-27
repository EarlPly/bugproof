// trace.test.ts — boundary-case tests for createTrace.
// Calls actual domain functions (reserveInventoryOriginal, reserveInventory)
// to produce results, then asserts on the trace structure and explanation text.

import { describe, it, expect } from "vitest";
import { createTrace } from "../src/lib/trace";
import type { TraceStep } from "../src/lib/trace";
import { reserveInventoryOriginal } from "../src/lib/inventory-original";
import { reserveInventory } from "../src/lib/inventory";
import type { Scalar } from "../src/lib/lab";

const STOCK = 5;

function orig(quantity: Scalar) {
  return reserveInventoryOriginal(STOCK, quantity);
}
function fixed(quantity: Scalar) {
  return reserveInventory(STOCK, quantity);
}

function assertStructure(steps: TraceStep[]) {
  expect(steps).toHaveLength(4);
  const ids = steps.map((s) => s.id);
  expect(ids).toEqual(["stock", "input", "compute", "response"]);
  for (const s of steps) {
    expect(typeof s.title).toBe("string");
    expect(s.title.length).toBeGreaterThan(0);
    expect(typeof s.explanation).toBe("string");
    expect(s.explanation.length).toBeGreaterThan(0);
    expect(typeof s.code).toBe("string");
  }
}

// ── ORIGINAL mode ─────────────────────────────────────────────────────────

describe("original mode", () => {
  it("overflow: quantity 7 → stock becomes -2", () => {
    const quantity = 7;
    const result = orig(quantity);
    expect(result).toEqual({ status: 200, stock: -2, reserved: 7, message: "reserved" });
    const steps = createTrace(quantity, result, "original");
    assertStructure(steps);
    expect(steps[0].stock).toBe(5);
    expect(steps[1].stock).toBe(5);
    expect(steps[2].stock).toBe(-2);
    expect(steps[3].stock).toBe(-2);
    expect(steps[2].explanation).toMatch(/negative/i);
    // type-only assertion mentioned
    expect(steps[2].explanation).toMatch(/type-only assertion/i);
  });

  it("negative: quantity -2 → stock becomes 7 (adds stock)", () => {
    const quantity = -2;
    const result = orig(quantity);
    expect(result).toEqual({ status: 200, stock: 7, reserved: -2, message: "reserved" });
    const steps = createTrace(quantity, result, "original");
    assertStructure(steps);
    expect(steps[2].stock).toBe(7);
    expect(steps[3].stock).toBe(7);
    expect(steps[2].explanation).toMatch(/non-positive|increases|stays the same/i);
    expect(steps[2].explanation).toMatch(/type-only assertion/i);
  });

  it("text banana → stock is NaN, reserved stays as string", () => {
    const quantity = "banana";
    const result = orig(quantity);
    // `as number` is type-only; runtime value stays "banana" (a string).
    // JS arithmetic: 5 - "banana" = NaN.
    expect(result.status).toBe(200);
    expect(result.stock).toBeNaN();
    expect(result.reserved).toBe("banana"); // reserved is still the string
    const steps = createTrace(quantity, result, "original");
    assertStructure(steps);
    // Input step: string type and quoted literal
    expect(steps[1].code).toContain('"banana"');
    expect(steps[1].explanation).toContain("string");
    // Compute step: truthful NaN explanation, mentions type-only assertion, no claim that cast converts
    expect(steps[2].explanation).toMatch(/NaN/);
    expect(steps[2].explanation).toMatch(/type-only assertion/i);
    expect(steps[2].explanation).not.toMatch(/cast.*NaN|NaN.*cast/i); // must not say "cast produces NaN"
    // Response code: NaN serialised as "NaN" string, not null
    expect(steps[3].code).toContain('"NaN"');
    expect(steps[3].code).not.toMatch(/"stock"\s*:\s*null/);
  });

  it("numeric-string '3' → stock becomes 2 (JS coerces string to 3)", () => {
    const quantity = "3";
    const result = orig(quantity);
    // JS arithmetic coerces "3" to 3: 5 - 3 = 2.
    // reserved is still the string "3" (as number is type-only).
    expect(result.status).toBe(200);
    expect(result.stock).toBe(2);
    expect(result.reserved).toBe("3"); // string, not number
    const steps = createTrace(quantity, result, "original");
    assertStructure(steps);
    // Input: string type
    expect(steps[1].explanation).toContain("string");
    expect(steps[1].code).toContain('"3"');
    // Compute: mentions coercion and finite result 2, mentions type-only assertion
    expect(steps[2].explanation).toMatch(/coerce/i);
    expect(steps[2].explanation).toMatch(/type-only assertion/i);
    expect(steps[2].explanation).toContain("2");
    // Compute stock reflects actual result
    expect(steps[2].stock).toBe(2);
  });

  it("null → stock becomes 5 (JS coerces null to 0)", () => {
    const quantity = null;
    const result = orig(quantity);
    // JS arithmetic: 5 - null = 5 - 0 = 5.
    expect(result.status).toBe(200);
    expect(result.stock).toBe(5);
    expect(result.reserved).toBeNull();
    const steps = createTrace(quantity, result, "original");
    assertStructure(steps);
    // Input: null type
    expect(steps[1].code).toContain("null");
    expect(steps[1].explanation).toContain("object"); // typeof null === "object"
    // Compute: mentions coercion, type-only assertion, result 5
    expect(steps[2].explanation).toMatch(/coerce/i);
    expect(steps[2].explanation).toMatch(/type-only assertion/i);
    expect(steps[2].explanation).toContain("5");
    expect(steps[2].stock).toBe(5);
  });

  it("boolean true → stock becomes 4 (JS coerces true to 1)", () => {
    const quantity = true;
    const result = orig(quantity);
    // JS arithmetic: 5 - true = 5 - 1 = 4.
    expect(result.status).toBe(200);
    expect(result.stock).toBe(4);
    expect(result.reserved).toBe(true);
    const steps = createTrace(quantity, result, "original");
    assertStructure(steps);
    // Input: boolean type
    expect(steps[1].explanation).toContain("boolean");
    expect(steps[1].code).toContain("true");
    // Compute: mentions coercion, type-only assertion, result 4
    expect(steps[2].explanation).toMatch(/coerce/i);
    expect(steps[2].explanation).toMatch(/type-only assertion/i);
    expect(steps[2].explanation).toContain("4");
    expect(steps[2].stock).toBe(4);
  });

  it("normal: quantity 3 → stock becomes 2", () => {
    const quantity = 3;
    const result = orig(quantity);
    expect(result).toEqual({ status: 200, stock: 2, reserved: 3, message: "reserved" });
    const steps = createTrace(quantity, result, "original");
    assertStructure(steps);
    expect(steps[2].stock).toBe(2);
    expect(steps[3].stock).toBe(2);
  });

  it("exact: quantity 5 → stock becomes 0", () => {
    const quantity = 5;
    const result = orig(quantity);
    expect(result).toEqual({ status: 200, stock: 0, reserved: 5, message: "reserved" });
    const steps = createTrace(quantity, result, "original");
    assertStructure(steps);
    expect(steps[2].stock).toBe(0);
  });

  it("zero: quantity 0 → stock stays 5 (original allows it)", () => {
    const quantity = 0;
    const result = orig(quantity);
    expect(result).toEqual({ status: 200, stock: 5, reserved: 0, message: "reserved" });
    const steps = createTrace(quantity, result, "original");
    assertStructure(steps);
    expect(steps[2].stock).toBe(5);
  });
});

// ── FIXED mode ─────────────────────────────────────────────────────────────

describe("fixed mode", () => {
  it("overflow: quantity 7 → 409, stock preserved at 5", () => {
    const quantity = 7;
    const result = fixed(quantity);
    expect(result).toEqual({ status: 409, stock: 5, reserved: 0, message: "insufficient stock" });
    const steps = createTrace(quantity, result, "fixed");
    assertStructure(steps);
    expect(steps[0].stock).toBe(5);
    expect(steps[2].stock).toBe(5);
    expect(steps[3].stock).toBe(5);
    expect(steps[2].explanation).toMatch(/409|insufficient|capacity/i);
  });

  it("negative: quantity -2 → 400, stock preserved at 5", () => {
    const quantity = -2;
    const result = fixed(quantity);
    expect(result).toEqual({ status: 400, stock: 5, reserved: 0, message: "invalid quantity" });
    const steps = createTrace(quantity, result, "fixed");
    assertStructure(steps);
    expect(steps[2].stock).toBe(5);
    expect(steps[2].explanation).toMatch(/400|invalid|guard/i);
  });

  it("text banana → 400, stock preserved at 5, no subtract", () => {
    const quantity = "banana";
    const result = fixed(quantity);
    expect(result).toEqual({ status: 400, stock: 5, reserved: 0, message: "invalid quantity" });
    const steps = createTrace(quantity, result, "fixed");
    assertStructure(steps);
    expect(steps[2].stock).toBe(5);
    expect(steps[2].explanation).toMatch(/400|invalid|not a number/i);
    expect(steps[2].explanation).not.toMatch(/subtract/i);
  });

  it("numeric-string '3' → 400, stock preserved at 5", () => {
    const quantity = "3";
    const result = fixed(quantity);
    expect(result).toEqual({ status: 400, stock: 5, reserved: 0, message: "invalid quantity" });
    const steps = createTrace(quantity, result, "fixed");
    assertStructure(steps);
    expect(steps[2].stock).toBe(5);
    expect(steps[2].explanation).toMatch(/400|invalid|not a number/i);
    expect(steps[2].explanation).not.toMatch(/subtract/i);
  });

  it("null → 400, stock preserved at 5", () => {
    const quantity = null;
    const result = fixed(quantity);
    expect(result).toEqual({ status: 400, stock: 5, reserved: 0, message: "invalid quantity" });
    const steps = createTrace(quantity, result, "fixed");
    assertStructure(steps);
    expect(steps[2].stock).toBe(5);
    expect(steps[2].explanation).toMatch(/400|invalid|not a number/i);
  });

  it("boolean true → 400, stock preserved at 5", () => {
    const quantity = true;
    const result = fixed(quantity);
    expect(result).toEqual({ status: 400, stock: 5, reserved: 0, message: "invalid quantity" });
    const steps = createTrace(quantity, result, "fixed");
    assertStructure(steps);
    expect(steps[2].stock).toBe(5);
    expect(steps[2].explanation).toMatch(/400|invalid|not a number/i);
  });

  it("normal: quantity 3 → 200, stock becomes 2", () => {
    const quantity = 3;
    const result = fixed(quantity);
    expect(result).toEqual({ status: 200, stock: 2, reserved: 3, message: "reserved" });
    const steps = createTrace(quantity, result, "fixed");
    assertStructure(steps);
    expect(steps[2].stock).toBe(2);
    expect(steps[3].stock).toBe(2);
  });

  it("exact: quantity 5 → 200, stock becomes 0", () => {
    const quantity = 5;
    const result = fixed(quantity);
    expect(result).toEqual({ status: 200, stock: 0, reserved: 5, message: "reserved" });
    const steps = createTrace(quantity, result, "fixed");
    assertStructure(steps);
    expect(steps[2].stock).toBe(0);
  });

  it("zero: quantity 0 → 400, stock preserved at 5", () => {
    const quantity = 0;
    const result = fixed(quantity);
    expect(result).toEqual({ status: 400, stock: 5, reserved: 0, message: "invalid quantity" });
    const steps = createTrace(quantity, result, "fixed");
    assertStructure(steps);
    expect(steps[2].stock).toBe(5);
  });
});

// ── Step 1 always shows starting stock 5 ───────────────────────────────────

describe("step 1 invariant", () => {
  it("first step stock is always 5 regardless of mode or quantity", () => {
    const quantities: Scalar[] = [7, -2, "banana", 3, 5, 0, "3", null, true];
    for (const quantity of quantities) {
      for (const mode of ["original", "fixed"] as const) {
        const result = mode === "original" ? orig(quantity) : fixed(quantity);
        const steps = createTrace(quantity, result, mode);
        expect(steps[0].stock).toBe(5);
      }
    }
  });
});

// ── Step 4 always mirrors result ────────────────────────────────────────────

describe("step 4 mirrors result", () => {
  it("response step stock equals result.stock for number inputs", () => {
    const cases: Scalar[] = [7, -2, 3, 5, 0];
    for (const quantity of cases) {
      const ro = orig(quantity);
      const steps_o = createTrace(quantity, ro, "original");
      expect(steps_o[3].stock).toBe(ro.stock);

      const rf = fixed(quantity);
      const steps_f = createTrace(quantity, rf, "fixed");
      expect(steps_f[3].stock).toBe(rf.stock);
    }
  });

  it("response code uses NaN replacer so banana result is not null", () => {
    const quantity = "banana";
    const result = orig(quantity);
    expect(result.stock).toBeNaN();
    const steps = createTrace(quantity, result, "original");
    // serializeResult must render NaN as "NaN", not null
    expect(steps[3].code).toContain('"NaN"');
    expect(steps[3].code).not.toMatch(/"stock"\s*:\s*null/);
  });
});
