import { describe, it, expect } from "vitest";
import { reserveInventory } from "../src/lib/inventory";
import { reserveInventoryOriginal } from "../src/lib/inventory-original";

// ---------------------------------------------------------------------------
// Regression test — must fail before the fix, pass after.
// ---------------------------------------------------------------------------
describe("reserveInventory — regression: insufficient stock", () => {
  it("returns status 409 and preserves stock when quantity exceeds stock (stock=5, qty=7)", () => {
    const result = reserveInventory(5, 7);
    expect(result.status).toBe(409);
    expect(result.stock).toBe(5);
    expect(result.reserved).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Fixed function — full behavioural suite
// ---------------------------------------------------------------------------
describe("reserveInventory — success cases", () => {
  it("normal reservation reduces stock correctly", () => {
    const r = reserveInventory(10, 3);
    expect(r.status).toBe(200);
    expect(r.stock).toBe(7);
    expect(r.reserved).toBe(3);
  });

  it("exact-stock reservation (quantity === stock)", () => {
    const r = reserveInventory(5, 5);
    expect(r.status).toBe(200);
    expect(r.stock).toBe(0);
    expect(r.reserved).toBe(5);
  });
});

describe("reserveInventory — insufficient stock (409)", () => {
  it("returns 409 and does not mutate stock when qty > stock", () => {
    const r = reserveInventory(3, 10);
    expect(r.status).toBe(409);
    expect(r.stock).toBe(3);
    expect(r.reserved).toBe(0);
  });
});

describe("reserveInventory — invalid quantity (400)", () => {
  it("zero quantity is invalid", () => {
    const r = reserveInventory(10, 0);
    expect(r.status).toBe(400);
    expect(r.stock).toBe(10);
    expect(r.reserved).toBe(0);
  });

  it("negative quantity is invalid", () => {
    const r = reserveInventory(10, -3);
    expect(r.status).toBe(400);
    expect(r.stock).toBe(10);
    expect(r.reserved).toBe(0);
  });

  it("fractional quantity is invalid", () => {
    const r = reserveInventory(10, 1.5);
    expect(r.status).toBe(400);
    expect(r.stock).toBe(10);
    expect(r.reserved).toBe(0);
  });

  it("non-numeric string quantity is invalid", () => {
    const r = reserveInventory(10, "abc");
    expect(r.status).toBe(400);
    expect(r.stock).toBe(10);
    expect(r.reserved).toBe(0);
  });

  it("unsafe integer quantity is invalid", () => {
    const r = reserveInventory(10, Number.MAX_SAFE_INTEGER + 1);
    expect(r.status).toBe(400);
    expect(r.stock).toBe(10);
    expect(r.reserved).toBe(0);
  });
});

describe("reserveInventory — invalid stock (400)", () => {
  it("negative stock is invalid", () => {
    const r = reserveInventory(-1, 1);
    expect(r.status).toBe(400);
    expect(r.stock).toBe(-1);
    expect(r.reserved).toBe(0);
  });

  it("fractional stock is invalid", () => {
    const r = reserveInventory(2.5, 1);
    expect(r.status).toBe(400);
    expect(r.stock).toBe(2.5);
    expect(r.reserved).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Original fixture — documents the known defect
// ---------------------------------------------------------------------------
describe("reserveInventoryOriginal — defect demonstration", () => {
  it("subtracts quantity with no guard: stock=5 qty=7 → remaining=-2", () => {
    const r = reserveInventoryOriginal(5, 7);
    expect(r.status).toBe(200);
    expect(r.stock).toBe(-2);  // the bug: negative stock
    expect(r.reserved).toBe(7);
  });
});
