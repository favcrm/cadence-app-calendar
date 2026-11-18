// The client turns every refusal into an explicit outcome, and the real app-kit
// bridge never sends an operation a host has not offered. Run: bun test tests/contract/calendar_client.test.ts
import { expect, mock, test } from "bun:test";

class ApiError extends Error {
  status: number; code?: string;
  constructor(message: string, status: number, extra?: { code?: string }) { super(message); this.status = status; this.code = extra?.code; }
}
mock.module("@cadence/screen-ui", () => ({ ApiError }));

const { listRoutines, queryCalendar } = await import("../../src/bridge/calendarClient");
const { createCalendarBridge } = await import("../../src/bridge/channel");

const good = { entries: [{ source: "post", id: "p1", starts_at: "2026-11-16T09:00:00+08:00", title: "Menu", state: "posted", needs_you: false }], zone: "Asia/Hong_Kong", sources: [{ source: "post", ok: true }] };
const range = { from: "2026-11-16", to: "2026-11-23" };
const host = (offers: boolean, request: (verb: string, args: Record<string, unknown>) => Promise<unknown>) => ({ offers: () => offers, request });

test("an answer that matches the contract is ok", async () => {
  const calls: unknown[] = [];
  const out = await queryCalendar(host(true, async (verb, args) => { calls.push([verb, args]); return good; }), range);
  expect(out.status).toBe("ok");
  expect(calls).toEqual([["calendar.query", { from: "2026-11-16", to: "2026-11-23" }]]);
});

test("a host that does not offer the operation is unavailable and is never asked", async () => {
  let asked = 0;
  const h = host(false, async () => { asked += 1; return good; });
  expect(await queryCalendar(h, range)).toEqual({ status: "unavailable", reason: "not-offered" });
  expect(await listRoutines(h)).toEqual({ status: "unavailable", reason: "not-offered" });
  expect(asked).toBe(0);
});

test("a host refusal is unavailable, never an empty calendar", async () => {
  for (const status of [400, 403, 404, 503]) {
    const out = await queryCalendar(host(true, async () => { throw new ApiError("This workspace doesn't offer that action.", status, { code: "forbidden" }); }), range);
    expect(out).toEqual({ status: "unavailable", reason: "refused" });
  }
});

test("a malformed reply is unavailable, never repaired", async () => {
  for (const reply of [null, {}, { entries: [], zone: "Asia/Hong_Kong" }, { ...good, entries: [{ ...good.entries[0], starts_at: undefined }] }, { routines: [] }]) {
    expect(await queryCalendar(host(true, async () => reply), range)).toEqual({ status: "unavailable", reason: "malformed" });
  }
  expect(await listRoutines(host(true, async () => ({ routines: [{ id: "r1" }] })))).toEqual({ status: "unavailable", reason: "malformed" });
});

test("a timeout is a retryable error, not a verdict that the host is too old", async () => {
  const out = await queryCalendar(host(true, async () => { throw new ApiError("Request did not answer.", 504, { code: "timeout" }); }), range);
  expect(out.status).toBe("error");
});

test("a bad range is a programming error", () => {
  expect(() => queryCalendar(host(true, async () => good), { from: "2026-11-23", to: "2026-11-16" })).toThrow(RangeError);
  expect(() => queryCalendar(host(true, async () => good), { from: "soon", to: "later" })).toThrow(RangeError);
});

test("the app-kit bridge declares the operations but refuses them until a host pushes them", () => {
  const bridge = createCalendarBridge();
  expect(bridge.operations).toEqual(["calendar.query", "routines.list"]);
  // No push yet, and an older host pushes no actions: the bridge offers nothing.
  expect(bridge.can("calendar.query")).toBe(false);
  expect(bridge.can("routines.list", [])).toBe(false);
  expect(bridge.can("routines.list", ["routines.list"])).toBe(true);
});
