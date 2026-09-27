import { reserveInventory } from "../../../src/lib/inventory";
import { reserveInventoryOriginal } from "../../../src/lib/inventory-original";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 4096;
const STARTING_STOCK = 5;
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

function error(status: number, message: string) {
  return Response.json({ status, stock: STARTING_STOCK, reserved: 0, message }, { status, headers });
}

export async function POST(request: Request): Promise<Response> {
  const mediaType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (mediaType !== "application/json") return error(415, "Send an application/json request.");
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return error(413, "Request body is too large.");

  // Bound the actual streamed bytes as well as any declared Content-Length.
  const reader = request.body?.getReader();
  if (!reader) return error(400, "A JSON request body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        return error(413, "Request body is too large.");
      }
      chunks.push(value);
    }
  } catch {
    return error(400, "The request body could not be read.");
  } finally {
    reader.releaseLock();
  }

  let body: unknown;
  try {
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return error(400, "The request body must be valid JSON.");
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) return error(400, "Provide quantity and mode.");
  const input = body as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(input, "quantity") ||
      !Object.prototype.hasOwnProperty.call(input, "mode") ||
      Object.keys(input).some((key) => key !== "quantity" && key !== "mode") ||
      (input.mode !== "original" && input.mode !== "fixed") ||
      (input.quantity !== null && !["number", "string", "boolean"].includes(typeof input.quantity))) {
    return error(400, "Provide a scalar quantity and mode of original or fixed.");
  }

  // Each request starts from five sample units. No shared stock or user code.
  const run = input.mode === "original" ? reserveInventoryOriginal : reserveInventory;
  const result = run(STARTING_STOCK, input.quantity);
  // The deliberately broken fixture can produce NaN; retain that evidence
  // explicitly instead of silently letting JSON.stringify replace it with null.
  const serializable = JSON.parse(JSON.stringify(result, (_key, value: unknown) =>
    typeof value === "number" && !Number.isFinite(value) ? String(value) : value));
  return Response.json(serializable, { status: result.status, headers });
}
