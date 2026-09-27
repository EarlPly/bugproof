// inventory.ts — fixed implementation.

export type { ReservationResult } from "./inventory-original";
import type { ReservationResult } from "./inventory-original";

export function reserveInventory(
  stock: number,
  quantity: unknown
): ReservationResult {
  // Validate stock: must be a nonnegative safe integer.
  if (!Number.isSafeInteger(stock) || stock < 0) {
    return { status: 400, stock, reserved: 0, message: "invalid stock" };
  }

  // Validate quantity: must be a positive safe integer.
  if (!Number.isSafeInteger(quantity) || (quantity as number) <= 0) {
    return { status: 400, stock, reserved: 0, message: "invalid quantity" };
  }

  const qty = quantity as number;

  // Check sufficient stock.
  if (qty > stock) {
    return { status: 409, stock, reserved: 0, message: "insufficient stock" };
  }

  return {
    status: 200,
    stock: stock - qty,
    reserved: qty,
    message: "reserved",
  };
}
