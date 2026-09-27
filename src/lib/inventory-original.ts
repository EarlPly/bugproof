// inventory-original.ts — intentionally broken fixture.
// Subtracts quantity from stock with no validation: stock 5, quantity 7 → -2.

export type ReservationResult = {
  status: number;
  stock: number;
  reserved: number;
  message: string;
};

export function reserveInventoryOriginal(
  stock: number,
  quantity: unknown
): ReservationResult {
  const qty = quantity as number;
  const remaining = stock - qty;
  return {
    status: 200,
    stock: remaining,
    reserved: qty,
    message: "reserved",
  };
}
