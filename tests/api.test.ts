import { describe, expect, it } from "vitest";
import { POST } from "../app/api/reserve/route";

function request(body: unknown) {
  return new Request("http://localhost/api/reserve", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

describe("reservation HTTP boundary", () => {
  it("propagates a fixed conflict without consuming stock", async () => {
    const response = await POST(request({ mode: "fixed", quantity: 7 }));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ status: 409, stock: 5, reserved: 0 });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("preserves the seeded original bug for comparison", async () => {
    const response = await POST(request({ mode: "original", quantity: 7 }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 200, stock: -2, reserved: 7 });
  });

  it("isolates state between requests", async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await POST(request({ mode: "fixed", quantity: 3 }));
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ stock: 2, reserved: 3 });
    }
  });

  it.each([0, -2, 1.5, "abc", "3", null, true, Number.MAX_SAFE_INTEGER + 1])("rejects invalid fixed quantity %j without mutation", async (quantity) => {
    const response = await POST(request({ mode: "fixed", quantity }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ stock: 5, reserved: 0 });
  });

  it.each([null, [], {}, { quantity: 2 }, { mode: "fixed" }, { mode: "unknown", quantity: 2 },
    { mode: "fixed", quantity: {} }, { mode: "fixed", quantity: [] }, { mode: "fixed", quantity: 2, stock: 999 }])("rejects invalid request schema %j", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
  });

  it("rejects malformed JSON", async () => {
    const response = await POST(new Request("http://localhost/api/reserve", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{broken",
    }));
    expect(response.status).toBe(400);
  });

  it("rejects non-JSON media types", async () => {
    const response = await POST(new Request("http://localhost/api/reserve", { method: "POST", body: "hello" }));
    expect(response.status).toBe(415);
  });

  it("bounds actual body bytes even without Content-Length", async () => {
    const response = await POST(request({ mode: "fixed", quantity: "a".repeat(4097) }));
    expect(response.status).toBe(413);
  });

  it("does not disguise original non-finite output as a numeric result", async () => {
    const response = await POST(request({ mode: "original", quantity: "abc" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ stock: "NaN", reserved: "abc" });
  });
});
