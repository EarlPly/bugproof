// trace.ts — explanatory replay of a deterministic reservation call.
// Not live instrumentation. Derives every display value from the actual
// quantity/result passed in. Stateless; no side effects.

import type { Scalar } from "./lab";
import type { Result } from "./lab";

export type TraceStep = {
  id: string;
  title: string;
  explanation: string;
  code: string;
  stock: number | string | boolean | null;
};

const STARTING_STOCK = 5;

/** Produce a JSON-safe representation of quantity for display in code snippets. */
function quantityLiteral(quantity: Scalar): string {
  return JSON.stringify(quantity); // null→"null", "3"→'"3"', true→"true", 7→"7"
}

/**
 * Serialize a Result for the response code block.
 * JSON.stringify replaces NaN with null by default; we replace non-finite
 * numbers with their string names so the output is truthful.
 */
function serializeResult(result: Result): string {
  return JSON.stringify(result, (_key, value) =>
    typeof value === "number" && !Number.isFinite(value) ? String(value) : value
  );
}

/**
 * Describe what JavaScript subtraction actually produces for a non-number
 * quantity. `as number` in TypeScript is a type-only assertion — it does not
 * convert the runtime value. JS arithmetic then coerces the operand:
 *   - numeric string "3" → 2  (coerced to 3)
 *   - null               → 5  (coerced to 0)
 *   - true               → 4  (coerced to 1)
 *   - "banana"           → NaN (cannot be coerced)
 */
function originalComputeExplanation(quantity: Scalar, remaining: number): string {
  const ql = quantityLiteral(quantity);
  const t = typeof quantity;
  const base =
    `\`quantity as number\` is a TypeScript type-only assertion — it does not convert ` +
    `the runtime value. JavaScript subtraction then coerces the operand. `;

  if (t === "number") {
    const qty = quantity as number;
    if (qty <= 0) {
      return (
        base +
        `quantity ${ql} is a number so no coercion occurs. ` +
        `Subtracting a non-positive value: ${STARTING_STOCK} − (${ql}) = ${remaining}. ` +
        `Stock increases or stays the same — not a real reservation.`
      );
    }
    if (qty > STARTING_STOCK) {
      return (
        base +
        `quantity ${ql} is a number so no coercion occurs. ` +
        `${STARTING_STOCK} − ${ql} = ${remaining}. ` +
        `Stock goes negative, overselling the item.`
      );
    }
    return (
      base +
      `quantity ${ql} is a number so no coercion occurs. ` +
      `${STARTING_STOCK} − ${ql} = ${remaining}.`
    );
  }

  if (Number.isNaN(remaining)) {
    return (
      base +
      `quantity ${ql} is a ${t}. JavaScript cannot coerce it to a useful number, ` +
      `so the subtraction produces NaN. The reserved value remains ${ql}, which is not a valid quantity.`
    );
  }

  // Finite result from a non-number (string "3", null, boolean)
  const coercedTo = STARTING_STOCK - remaining; // what JS treated qty as
  return (
    base +
    `quantity ${ql} is a ${t}. JavaScript coerces it to ${coercedTo} for arithmetic, ` +
    `so ${STARTING_STOCK} − ${coercedTo} = ${remaining}. ` +
    `The reservation appears to succeed, but the input was never validated.`
  );
}

/**
 * Build a four-step explanatory replay for one reservation call.
 *
 * Step 1 – starting state (stock = 5 before the call)
 * Step 2 – request input (actual JS type preserved)
 * Step 3 – computation / guard path taken
 * Step 4 – response returned
 */
export function createTrace(
  quantity: Scalar,
  result: Result,
  mode: "original" | "fixed"
): TraceStep[] {
  const ql = quantityLiteral(quantity);

  // ── Step 1: starting stock ──────────────────────────────────────────────
  const step1: TraceStep = {
    id: "stock",
    title: "Starting stock",
    explanation: `The warehouse begins with ${STARTING_STOCK} units in stock before any reservation is processed.`,
    code: `const stock = ${STARTING_STOCK};`,
    stock: STARTING_STOCK,
  };

  // ── Step 2: request input ───────────────────────────────────────────────
  const step2: TraceStep = {
    id: "input",
    title: "Request input",
    explanation:
      `The caller sent quantity = ${ql} (JavaScript type: ${typeof quantity}). ` +
      `The value arrives as-is; no coercion has happened yet.`,
    code: `quantity = ${ql}; // typeof === "${typeof quantity}"`,
    stock: STARTING_STOCK,
  };

  // ── Step 3: computation / guard path ───────────────────────────────────
  let step3: TraceStep;

  if (mode === "original") {
    // The original blindly casts and subtracts — no validation at all.
    // Compute remaining the same way the original does at runtime.
    const remaining = STARTING_STOCK - (quantity as number);
    const remainingDisplay = Number.isNaN(remaining) ? "NaN" : String(remaining);
    step3 = {
      id: "compute",
      title: "Computation (original — no validation)",
      explanation: originalComputeExplanation(quantity, remaining),
      code:
        `const qty = quantity as number; // runtime value still ${ql}\n` +
        `const remaining = stock - qty;  // ${STARTING_STOCK} - ${ql} = ${remainingDisplay}`,
      stock: result.stock,
    };
  } else {
    // Fixed implementation: validate quantity first, then check capacity, then subtract.
    if (result.status === 400) {
      const reason =
        typeof quantity !== "number"
          ? "it is not a number"
          : (quantity as number) <= 0
          ? "it is not a positive integer"
          : "it is not a safe integer";
      step3 = {
        id: "compute",
        title: "Guard: invalid quantity → 400",
        explanation:
          `The fixed implementation checks \`Number.isSafeInteger(quantity) && quantity > 0\` ` +
          `before touching stock. quantity = ${ql} fails that guard (${reason}), ` +
          `so the function returns 400 immediately. Stock is preserved at ${STARTING_STOCK}.`,
        code:
          `if (!Number.isSafeInteger(quantity) || quantity <= 0) {\n` +
          `  return { status: 400, stock, reserved: 0, message: "invalid quantity" };\n` +
          `}`,
        stock: STARTING_STOCK,
      };
    } else if (result.status === 409) {
      step3 = {
        id: "compute",
        title: "Guard: insufficient stock → 409",
        explanation:
          `quantity = ${ql} is a valid positive safe integer, but ${ql} > ${STARTING_STOCK} (current stock). ` +
          `The fixed implementation checks capacity before subtracting and returns 409. ` +
          `Stock stays at ${STARTING_STOCK}.`,
        code:
          `if (qty > stock) {\n` +
          `  return { status: 409, stock, reserved: 0, message: "insufficient stock" };\n` +
          `}`,
        stock: STARTING_STOCK,
      };
    } else {
      const remaining = STARTING_STOCK - (quantity as number);
      step3 = {
        id: "compute",
        title: "Subtraction (valid input)",
        explanation:
          `quantity = ${ql} passed all guards (positive safe integer, within stock). ` +
          `The reservation proceeds: ${STARTING_STOCK} − ${quantity} = ${remaining} units remain.`,
        code:
          `return { status: 200, stock: stock - qty, reserved: qty, message: "reserved" };\n` +
          `// stock: ${STARTING_STOCK} - ${quantity} = ${remaining}`,
        stock: remaining,
      };
    }
  }

  // ── Step 4: response ────────────────────────────────────────────────────
  const step4: TraceStep = {
    id: "response",
    title: "Response",
    explanation:
      `The function returned HTTP ${result.status}: "${result.message}". ` +
      `stock = ${result.stock}, reserved = ${result.reserved}.`,
    code: serializeResult(result),
    stock: result.stock,
  };

  return [step1, step2, step3, step4];
}
